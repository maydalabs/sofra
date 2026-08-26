-- Post-dinner channels: a moderation-pending public review, operations-only
-- constructive feedback, and a restricted safety report.
--
-- These are three deliberately separate destinations, not one form with a
-- visibility flag. Keeping them apart in the schema is what makes it hard to
-- accidentally publish something a traveller intended to be private.
--
-- No function here copies free text into the audit trail. Audit rows record that
-- a channel was used and in what state, never what was said.

-- The review form collects a rating and a title, and there was nowhere to put
-- either: reviews only had a body.
alter table public.public_experience_reviews
  add column if not exists rating integer check (rating between 1 and 5),
  add column if not exists title text;

-- ---------------------------------------------------------------------------
-- Shared guard
-- ---------------------------------------------------------------------------

create or replace function public.assert_completed_booking_owner(
  p_profile_id uuid,
  p_booking_id uuid
)
returns public.bookings
language plpgsql
stable
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id;

  if not found then
    raise exception 'booking not found' using errcode = 'SF001';
  end if;
  if v_booking.primary_traveler_id <> p_profile_id then
    raise exception 'booking does not belong to this traveller' using errcode = 'SF008';
  end if;
  if v_booking.status <> 'completed' then
    raise exception 'the dinner is not completed yet' using errcode = 'SF030';
  end if;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public experience review
--
-- Created unpublished. published_at stays null until moderation, and the public
-- reviews policy only exposes rows where it is set, so nothing a traveller
-- writes appears publicly without a decision.
-- ---------------------------------------------------------------------------

create or replace function public.submit_public_review(
  p_profile_id uuid,
  p_booking_id uuid,
  p_rating integer,
  p_title text,
  p_body text
)
returns public.public_experience_reviews
language plpgsql
as $$
declare
  v_booking public.bookings;
  v_review public.public_experience_reviews;
begin
  v_booking := public.assert_completed_booking_owner(p_profile_id, p_booking_id);

  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'rating must be between 1 and 5' using errcode = 'SF031';
  end if;

  if exists (
    select 1 from public.public_experience_reviews where booking_id = p_booking_id
  ) then
    raise exception 'this dinner already has a review' using errcode = 'SF032';
  end if;

  insert into public.public_experience_reviews (
    booking_id, author_profile_id, hosted_table_id, rating, title, body,
    published_at
  ) values (
    p_booking_id, p_profile_id, v_booking.hosted_table_id, p_rating, p_title,
    p_body, null
  )
  returning * into v_review;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, new_state
  ) values (
    p_profile_id, 'public_review.submitted', 'public_experience_review',
    v_review.id,
    -- Rating and moderation state only; the review text is not duplicated here.
    jsonb_build_object(
      'booking_id', p_booking_id,
      'rating', v_review.rating,
      'moderation', 'pending'
    )
  );

  return v_review;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private constructive feedback
--
-- Operations-only. Never surfaced publicly and never shown to the household.
-- ---------------------------------------------------------------------------

create or replace function public.submit_private_feedback(
  p_profile_id uuid,
  p_booking_id uuid,
  p_body text
)
returns public.private_constructive_feedback
language plpgsql
as $$
declare
  v_feedback public.private_constructive_feedback;
begin
  perform public.assert_completed_booking_owner(p_profile_id, p_booking_id);

  insert into public.private_constructive_feedback (
    booking_id, author_profile_id, body
  ) values (p_booking_id, p_profile_id, p_body)
  returning * into v_feedback;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, new_state
  ) values (
    p_profile_id, 'private_feedback.submitted', 'private_constructive_feedback',
    v_feedback.id,
    -- Deliberately records only that feedback exists.
    jsonb_build_object('booking_id', p_booking_id)
  );

  return v_feedback;
end;
$$;

-- ---------------------------------------------------------------------------
-- Confidential safety report
--
-- Opening a report holds the payout for that dinner in the same transaction.
-- The product rule is that money does not move while a safety question is open,
-- and enforcing it here means it cannot be missed by whichever screen reports.
-- ---------------------------------------------------------------------------

create or replace function public.report_safety_incident(
  p_profile_id uuid,
  p_booking_id uuid,
  p_severity text,
  p_confidential_report text
)
returns public.safety_incidents
language plpgsql
as $$
declare
  v_booking public.bookings;
  v_incident public.safety_incidents;
  v_held integer;
begin
  v_booking := public.assert_completed_booking_owner(p_profile_id, p_booking_id);

  if p_severity not in ('low', 'medium', 'high', 'critical') then
    raise exception 'unknown severity' using errcode = 'SF031';
  end if;

  insert into public.safety_incidents (
    booking_id, hosted_table_id, reporter_profile_id, status, severity,
    confidential_report
  ) values (
    p_booking_id, v_booking.hosted_table_id, p_profile_id, 'open', p_severity,
    p_confidential_report
  )
  returning * into v_incident;

  update public.payout_records
  set status = 'held',
      hold_reason = 'Open safety report'
  where hosted_table_id = v_booking.hosted_table_id
    and status <> 'released';

  get diagnostics v_held = row_count;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, new_state
  ) values (
    p_profile_id, 'safety_incident.reported', 'safety_incident', v_incident.id,
    -- Severity and consequences only. The report text is never copied here.
    jsonb_build_object(
      'booking_id', p_booking_id,
      'severity', v_incident.severity,
      'status', v_incident.status,
      'payouts_held', v_held
    )
  );

  return v_incident;
end;
$$;
