-- Operator writes: decide applications, review and publish tables, triage
-- incidents, hold and release payouts.
--
-- Unlike traveller and host writes, these act on OTHER people's records. Every
-- function therefore re-checks the operator role here, in addition to the gate
-- in the repository factory. A privileged write that reached the database
-- without a role check would be the worst kind of bug to have only one guard
-- against.
--
-- Every function writes its audit row in the same transaction, with the reason
-- the operator gave.

create or replace function public.assert_operator(p_profile_id uuid)
returns void
language plpgsql
stable
as $$
begin
  if not (
    public.profile_has_role(p_profile_id, 'operator'::public.application_role)
    or public.profile_has_role(p_profile_id, 'administrator'::public.application_role)
  ) then
    raise exception 'operator role required' using errcode = 'SF020';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Host application decisions
--
-- Approving is what actually creates a certified host: it certifies the
-- household, records the capacity the operator assessed, and grants the role.
-- The capacity is an operator input because the certification rubric is still
-- an open product decision (docs/OPEN_QUESTIONS.md).
-- ---------------------------------------------------------------------------

create or replace function public.decide_host_application(
  p_operator_id uuid,
  p_application_id uuid,
  p_decision text,
  p_reason text default null,
  p_certified_capacity integer default null
)
returns public.host_applications
language plpgsql
as $$
declare
  v_application public.host_applications;
  v_previous public.application_status;
  v_next public.application_status;
begin
  perform public.assert_operator(p_operator_id);

  if p_decision not in ('approve', 'changes_requested', 'decline') then
    raise exception 'unknown decision' using errcode = 'SF025';
  end if;

  select * into v_application
  from public.host_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'application not found' using errcode = 'SF021';
  end if;

  if v_application.status not in ('submitted', 'under_review', 'changes_requested') then
    raise exception 'application is not open for a decision' using errcode = 'SF025';
  end if;

  v_previous := v_application.status;
  v_next := case p_decision
    when 'approve' then 'approved'::public.application_status
    when 'changes_requested' then 'changes_requested'::public.application_status
    else 'declined'::public.application_status
  end;

  if p_decision = 'approve' then
    if p_certified_capacity is null or p_certified_capacity not between 1 and 12 then
      raise exception 'approval requires a certified capacity between 1 and 12'
        using errcode = 'SF025';
    end if;
    if v_application.household_id is null then
      raise exception 'application has no household to certify' using errcode = 'SF021';
    end if;

    update public.households
    set status = 'certified'
    where id = v_application.household_id;

    insert into public.host_certifications (
      household_id, lead_host_profile_id, status,
      certified_traveler_capacity, valid_from, certified_by
    ) values (
      v_application.household_id, v_application.applicant_profile_id, 'active',
      p_certified_capacity, now(), p_operator_id
    );

    insert into public.role_assignments (profile_id, role_id)
    select v_application.applicant_profile_id, r.id
    from public.roles r where r.code = 'certified_host'
    on conflict (profile_id, role_id) do nothing;
  end if;

  update public.host_applications
  set status = v_next, decided_at = now()
  where id = p_application_id
  returning * into v_application;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_operator_id, 'host_application.' || p_decision, 'host_application',
    v_application.id, p_reason,
    jsonb_build_object('status', v_previous),
    jsonb_build_object(
      'status', v_application.status,
      'certified_capacity', p_certified_capacity
    )
  );

  return v_application;
end;
$$;

-- ---------------------------------------------------------------------------
-- Table review and publication
-- ---------------------------------------------------------------------------

create or replace function public.review_hosted_table(
  p_operator_id uuid,
  p_table_id uuid,
  p_decision text,
  p_reason text default null
)
returns public.hosted_tables
language plpgsql
as $$
declare
  v_table public.hosted_tables;
  v_previous public.hosted_table_status;
  v_next public.hosted_table_status;
begin
  perform public.assert_operator(p_operator_id);

  if p_decision not in ('approve', 'changes_requested', 'decline') then
    raise exception 'unknown decision' using errcode = 'SF025';
  end if;

  select * into v_table from public.hosted_tables
  where id = p_table_id for update;

  if not found then
    raise exception 'table not found' using errcode = 'SF022';
  end if;

  if v_table.status <> 'submitted' then
    raise exception 'only a submitted table may be reviewed' using errcode = 'SF022';
  end if;

  v_previous := v_table.status;
  v_next := case p_decision
    when 'approve' then 'approved'::public.hosted_table_status
    when 'changes_requested' then 'changes_requested'::public.hosted_table_status
    else 'cancelled'::public.hosted_table_status
  end;

  update public.hosted_tables
  set status = v_next,
      cancelled_at = case when p_decision = 'decline' then now() else cancelled_at end,
      cancellation_reason = case when p_decision = 'decline' then p_reason else cancellation_reason end
  where id = p_table_id
  returning * into v_table;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_operator_id, 'hosted_table.' || p_decision, 'hosted_table', v_table.id,
    p_reason,
    jsonb_build_object('status', v_previous),
    jsonb_build_object('status', v_table.status)
  );

  return v_table;
end;
$$;

/**
 * Publication is separate from approval on purpose: approving says the table
 * meets the standard, publishing is the act that makes it bookable by the
 * public. An operator can approve now and publish later.
 */
create or replace function public.publish_hosted_table(
  p_operator_id uuid,
  p_table_id uuid
)
returns public.hosted_tables
language plpgsql
as $$
declare
  v_table public.hosted_tables;
  v_previous public.hosted_table_status;
begin
  perform public.assert_operator(p_operator_id);

  select * into v_table from public.hosted_tables
  where id = p_table_id for update;

  if not found then
    raise exception 'table not found' using errcode = 'SF022';
  end if;

  if v_table.status <> 'approved' then
    raise exception 'only an approved table may be published' using errcode = 'SF022';
  end if;

  if not exists (
    select 1 from public.host_certifications c
    where c.household_id = v_table.household_id and c.status = 'active'
      and (c.valid_from is null or c.valid_from <= now())
      and (c.valid_until is null or c.valid_until > now())
  ) then
    raise exception 'household certification is not active' using errcode = 'SF012';
  end if;

  if v_table.booking_cutoff_at <= now() then
    raise exception 'booking cutoff has already passed' using errcode = 'SF003';
  end if;

  v_previous := v_table.status;

  update public.hosted_tables
  set status = 'published', published_at = now()
  where id = p_table_id
  returning * into v_table;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, previous_state, new_state
  ) values (
    p_operator_id, 'hosted_table.published', 'hosted_table', v_table.id,
    jsonb_build_object('status', v_previous),
    jsonb_build_object(
      'status', v_table.status,
      'published_at', v_table.published_at,
      'available_seats', v_table.available_seats
    )
  );

  return v_table;
end;
$$;

-- ---------------------------------------------------------------------------
-- Incident triage
--
-- The confidential report is never echoed into the audit payload. Operators can
-- see it in the restricted incident view; the audit trail records only that a
-- transition happened and why.
-- ---------------------------------------------------------------------------

create or replace function public.triage_incident(
  p_operator_id uuid,
  p_incident_id uuid,
  p_status public.incident_status,
  p_reason text default null
)
returns public.safety_incidents
language plpgsql
as $$
declare
  v_incident public.safety_incidents;
  v_previous public.incident_status;
begin
  perform public.assert_operator(p_operator_id);

  select * into v_incident from public.safety_incidents
  where id = p_incident_id for update;

  if not found then
    raise exception 'incident not found' using errcode = 'SF024';
  end if;

  if v_incident.status in ('resolved', 'closed') and p_status <> 'closed' then
    raise exception 'a settled incident cannot be reopened here' using errcode = 'SF025';
  end if;

  v_previous := v_incident.status;

  update public.safety_incidents
  set status = p_status,
      assigned_to = coalesce(v_incident.assigned_to, p_operator_id),
      resolved_at = case when p_status in ('resolved', 'closed') then now() else resolved_at end
  where id = p_incident_id
  returning * into v_incident;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_operator_id, 'safety_incident.triaged', 'safety_incident', v_incident.id,
    p_reason,
    jsonb_build_object('status', v_previous),
    jsonb_build_object('status', v_incident.status, 'severity', v_incident.severity)
  );

  return v_incident;
end;
$$;

-- ---------------------------------------------------------------------------
-- Payout control
--
-- A payout cannot be released while an incident on the same table is still
-- open. That coupling is a product rule, so it is enforced here rather than
-- left to whichever screen happens to call it.
-- ---------------------------------------------------------------------------

create or replace function public.hold_payout(
  p_operator_id uuid,
  p_payout_id uuid,
  p_hold_reason text
)
returns public.payout_records
language plpgsql
as $$
declare
  v_payout public.payout_records;
  v_previous public.payout_status;
begin
  perform public.assert_operator(p_operator_id);

  select * into v_payout from public.payout_records
  where id = p_payout_id for update;

  if not found then
    raise exception 'payout not found' using errcode = 'SF023';
  end if;

  if v_payout.status = 'released' then
    raise exception 'a released payout cannot be held' using errcode = 'SF025';
  end if;

  v_previous := v_payout.status;

  update public.payout_records
  set status = 'held', hold_reason = p_hold_reason
  where id = p_payout_id
  returning * into v_payout;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_operator_id, 'payout.held', 'payout', v_payout.id, p_hold_reason,
    jsonb_build_object('status', v_previous),
    jsonb_build_object('status', v_payout.status, 'amount_kurus', v_payout.amount_kurus)
  );

  return v_payout;
end;
$$;

create or replace function public.release_payout(
  p_operator_id uuid,
  p_payout_id uuid,
  p_reason text default null
)
returns public.payout_records
language plpgsql
as $$
declare
  v_payout public.payout_records;
  v_previous public.payout_status;
  v_open_incidents integer;
begin
  perform public.assert_operator(p_operator_id);

  select * into v_payout from public.payout_records
  where id = p_payout_id for update;

  if not found then
    raise exception 'payout not found' using errcode = 'SF023';
  end if;

  if v_payout.status = 'released' then
    raise exception 'payout is already released' using errcode = 'SF025';
  end if;

  select count(*) into v_open_incidents
  from public.safety_incidents i
  where i.hosted_table_id = v_payout.hosted_table_id
    and i.status not in ('resolved', 'closed');

  if v_open_incidents > 0 then
    raise exception 'an open safety incident blocks this payout'
      using errcode = 'SF026';
  end if;

  v_previous := v_payout.status;

  update public.payout_records
  set status = 'released', released_at = now(), hold_reason = null
  where id = p_payout_id
  returning * into v_payout;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_operator_id, 'payout.released', 'payout', v_payout.id, p_reason,
    jsonb_build_object('status', v_previous),
    jsonb_build_object('status', v_payout.status, 'amount_kurus', v_payout.amount_kurus)
  );

  return v_payout;
end;
$$;
