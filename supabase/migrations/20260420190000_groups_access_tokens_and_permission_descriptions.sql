alter table public.teacher_groups rename to groups;

alter table public.permissions
add column if not exists description text not null default '';

update public.permissions
set description = case code
  when 'read_public_exams' then 'View published public exams that are available to signed-in users.'
  when 'manage_students' then 'Add and remove student members within groups.'
  when 'create_remove_groups' then 'Create new groups and remove existing groups.'
  when 'edit_groups' then 'Change group names for groups you are allowed to edit.'
  when 'edit_public_exams' then 'Create and edit exams intended for public availability.'
  when 'edit_private_exams' then 'Create and edit private exams that are limited to assigned access.'
  else description
end;

alter table public.user_settings
add column if not exists group_access_token_hash text,
add column if not exists group_access_token_prefix text,
add column if not exists group_access_token_generated_at timestamptz,
add column if not exists group_access_token_rotated_at timestamptz;

drop policy if exists "teacher_groups_read_managed_or_member" on public.groups;
drop policy if exists "teacher_groups_insert_owner" on public.groups;
drop policy if exists "teacher_groups_update_managed" on public.groups;
drop policy if exists "teacher_groups_delete_managed" on public.groups;
drop policy if exists "group_memberships_read_managed_or_self" on public.group_memberships;
drop policy if exists "group_memberships_manage_managed" on public.group_memberships;
drop policy if exists "test_group_assignments_read_authorized" on public.test_group_assignments;
drop policy if exists "test_group_assignments_manage_authorized" on public.test_group_assignments;

create or replace function public.can_create_group()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.current_app_role() = 'admin'
    or public.has_app_permission('create_remove_groups')
  );
$$;

create or replace function public.enforce_group_owner_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    left join public.role_permissions rp on rp.role_id = r.id
    left join public.permissions p on p.id = rp.permission_id
    where ur.user_id = new.owner_user_id
      and (
        r.code = 'admin'
        or p.code = 'create_remove_groups'
      )
  ) then
    raise exception 'Group owners must have create/remove group access';
  end if;

  return new;
end;
$$;

create or replace function public.can_read_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.current_app_role() = 'admin'
    or public.has_app_permission('edit_groups')
    or public.has_app_permission('manage_students')
    or exists (
      select 1
      from public.groups g
      where g.id = target_group_id
        and g.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.group_memberships gm
      where gm.group_id = target_group_id
        and gm.student_user_id = auth.uid()
    )
  );
$$;

create or replace function public.can_rename_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.current_app_role() = 'admin'
    or public.has_app_permission('edit_groups')
  );
$$;

create or replace function public.can_manage_group_students(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.current_app_role() = 'admin'
    or public.has_app_permission('manage_students')
  );
$$;

create or replace function public.can_delete_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.current_app_role() = 'admin'
    or (
      public.has_app_permission('create_remove_groups')
      and exists (
        select 1
        from public.groups g
        where g.id = target_group_id
          and g.owner_user_id = auth.uid()
      )
    )
  );
$$;

create or replace function public.can_manage_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    public.can_rename_group(target_group_id)
    or public.can_manage_group_students(target_group_id)
    or public.can_delete_group(target_group_id)
  );
$$;

create or replace function public.can_read_test(target_test_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.tests t
    where t.id = target_test_id
      and (
        public.current_app_role() = 'admin'
        or (t.visibility = 'public' and t.status = 'published')
        or t.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.test_group_assignments tga
          join public.group_memberships gm on gm.group_id = tga.group_id
          where tga.test_id = t.id
            and gm.student_user_id = auth.uid()
        )
      )
  );
$$;

create policy "groups_read_authorized" on public.groups
for select using (public.can_read_group(id));

create policy "groups_insert_owner" on public.groups
for insert with check (auth.uid() = owner_user_id and public.can_create_group());

create policy "groups_update_authorized" on public.groups
for update using (public.can_rename_group(id)) with check (public.can_rename_group(id));

create policy "groups_delete_authorized" on public.groups
for delete using (public.can_delete_group(id));

create policy "group_memberships_read_authorized" on public.group_memberships
for select using (student_user_id = auth.uid() or public.can_read_group(group_id));

create policy "group_memberships_manage_authorized" on public.group_memberships
for all using (public.can_manage_group_students(group_id)) with check (public.can_manage_group_students(group_id));

create policy "test_group_assignments_read_authorized" on public.test_group_assignments
for select using (public.can_read_test(test_id) or public.can_read_group(group_id));

create policy "test_group_assignments_manage_authorized" on public.test_group_assignments
for all using (public.can_edit_test(test_id) or public.can_manage_group(group_id))
with check (public.can_edit_test(test_id) or public.can_manage_group(group_id));
