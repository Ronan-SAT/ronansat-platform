alter table public.roles
add column if not exists is_system boolean not null default false;

alter table public.roles
alter column code type text using code::text;

update public.roles
set is_system = true
where code in ('student', 'teacher', 'admin');

create unique index if not exists roles_label_lower_unique on public.roles (lower(label));
