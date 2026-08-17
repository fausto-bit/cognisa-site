-- Cognisa · Painel privado · Schema do Prontuário (Milestone 3)
-- Cole no SQL Editor do Supabase e clique em Run. Roda depois do schema.sql original.

create table if not exists patient_variables (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  variable_id text not null,
  value text,
  updated_at timestamptz not null default now(),
  unique (patient_id, variable_id)
);

alter table patient_variables enable row level security;

create policy "authenticated read/write patient_variables" on patient_variables
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
