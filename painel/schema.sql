-- Cognisa · Painel privado · Schema inicial (Milestone 1)
-- Cole este script inteiro no SQL Editor do Supabase (painel do projeto → SQL Editor → New query) e clique em Run.

create extension if not exists "pgcrypto";

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  initials text not null,
  birth_date date not null,
  medical_record_number text,
  created_at timestamptz not null default now()
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  visit_date date not null default current_date,
  track text not null check (track in ('cognisa_ciclo', 'unimed', 'particular_condensado')),
  status text not null default 'agendado' check (status in ('agendado', 'em_atendimento', 'revisao_pendente', 'orientacoes_enviadas')),
  created_at timestamptz not null default now()
);

alter table patients enable row level security;
alter table visits enable row level security;

-- Uso de um único médico autenticado: qualquer usuário logado pode ler/escrever.
-- Importante: depois de rodar este script, vá em Authentication -> Providers -> Email
-- e desative "Allow new users to sign up", para que só o usuário que você criar
-- manualmente consiga logar.

create policy "authenticated read/write patients" on patients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated read/write visits" on visits
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
