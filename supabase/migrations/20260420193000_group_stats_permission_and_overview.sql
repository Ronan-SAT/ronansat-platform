insert into public.permissions (code, label, description)
values (
  'group_stat_view',
  'View Group Stats',
  'View summary and member-level statistics for groups you are allowed to open.'
)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'group_stat_view'
where r.code in ('admin', 'teacher')
on conflict do nothing;

create or replace function public.get_group_stats_overview(target_group_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with member_base as (
    select
      gm.student_user_id as user_id,
      gm.created_at as joined_at
    from public.group_memberships gm
    where gm.group_id = target_group_id
  ),
  normalized_attempts as (
    select
      mb.user_id,
      ta.id as attempt_id,
      ta.mode,
      ta.submitted_at,
      coalesce(ta.total_score, ta.score)::int as normalized_score,
      t.title as test_title
    from member_base mb
    left join public.test_attempts ta on ta.user_id = mb.user_id
    left join public.tests t on t.id = ta.test_id
  ),
  member_rollup as (
    select
      mb.user_id,
      min(mb.joined_at) as joined_at,
      count(na.attempt_id)::int as tests_taken,
      count(*) filter (where na.attempt_id is not null and na.mode = 'full')::int as full_tests_taken,
      count(*) filter (where na.attempt_id is not null and na.mode = 'sectional')::int as sectional_tests_taken,
      max(na.submitted_at) as last_taken_at,
      max(na.normalized_score) filter (where na.normalized_score is not null)::int as best_score,
      case
        when count(na.normalized_score) filter (where na.normalized_score is not null) = 0 then null
        else round(avg(na.normalized_score) filter (where na.normalized_score is not null))::int
      end as average_score
    from member_base mb
    left join normalized_attempts na on na.user_id = mb.user_id
    group by mb.user_id
  ),
  latest_attempt as (
    select distinct on (na.user_id)
      na.user_id,
      na.submitted_at as latest_taken_at,
      na.normalized_score as latest_score,
      na.test_title as latest_test_title,
      na.mode as latest_mode
    from normalized_attempts na
    where na.attempt_id is not null
    order by na.user_id, na.submitted_at desc, na.attempt_id desc
  ),
  overview as (
    select
      count(*)::int as member_count,
      count(*) filter (where mr.tests_taken > 0)::int as active_members,
      coalesce(sum(mr.tests_taken), 0)::int as total_attempts,
      coalesce(sum(mr.full_tests_taken), 0)::int as full_attempts,
      coalesce(sum(mr.sectional_tests_taken), 0)::int as sectional_attempts,
      max(mr.last_taken_at) as last_taken_at,
      max(mr.best_score)::int as highest_score,
      case
        when count(mr.average_score) filter (where mr.average_score is not null) = 0 then null
        else round(avg(mr.average_score) filter (where mr.average_score is not null))::int
      end as average_score
    from member_rollup mr
  )
  select jsonb_build_object(
    'overview',
    jsonb_build_object(
      'memberCount', ov.member_count,
      'activeMembers', ov.active_members,
      'totalAttempts', ov.total_attempts,
      'fullAttempts', ov.full_attempts,
      'sectionalAttempts', ov.sectional_attempts,
      'averageScore', ov.average_score,
      'highestScore', ov.highest_score,
      'lastTakenAt', ov.last_taken_at
    ),
    'members',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'userId', mr.user_id,
          'joinedAt', mr.joined_at,
          'testsTaken', mr.tests_taken,
          'fullTestsTaken', mr.full_tests_taken,
          'sectionalTestsTaken', mr.sectional_tests_taken,
          'lastTakenAt', mr.last_taken_at,
          'latestScore', la.latest_score,
          'latestTestTitle', la.latest_test_title,
          'latestMode', la.latest_mode,
          'bestScore', mr.best_score,
          'averageScore', mr.average_score
        )
        order by coalesce(la.latest_taken_at, mr.joined_at) desc, mr.user_id
      )
      from member_rollup mr
      left join latest_attempt la on la.user_id = mr.user_id
    ), '[]'::jsonb)
  )
  from overview ov;
$$;

grant execute on function public.get_group_stats_overview(uuid) to service_role;
