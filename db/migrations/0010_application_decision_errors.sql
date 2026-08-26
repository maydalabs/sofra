-- Distinguishes "this application has no household to certify" from the other
-- reasons a decision can be refused.
--
-- Both previously raised SF021, so an operator approving an application that
-- was created without a household saw only "that decision is not valid right
-- now" -- true, but not actionable. The two cases need different wording
-- because they need different responses.

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
    raise exception 'application is not open for a decision' using errcode = 'SF021';
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
      raise exception 'application has no household to certify'
        using errcode = 'SF017';
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
