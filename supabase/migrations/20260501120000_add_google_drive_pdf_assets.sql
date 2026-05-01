alter table public.test_pdf_assets
add column if not exists storage_provider text not null default 'google_drive',
add column if not exists drive_file_id text,
add column if not exists drive_folder_id text;

create index if not exists test_pdf_assets_drive_lookup_idx
on public.test_pdf_assets (storage_provider, drive_file_id)
where drive_file_id is not null;

create index if not exists test_pdf_assets_active_provider_lookup_idx
on public.test_pdf_assets (test_id, mode, section_name, module_number, asset_kind, storage_provider, is_active);
