-- =============================================
-- SCHEMA DE BASE DE DATOS PARA APP DE MENSAJERÍA
-- Ejecutar este SQL en el SQL Editor de Supabase
-- =============================================

-- 1. Tabla de perfiles de usuario
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text default '',
  created_at timestamp with time zone default now()
);

-- 2. Tabla de solicitudes de amistad
create table if not exists friend_requests (
  id uuid default gen_random_uuid() primary key,
  from_user uuid references profiles(id) on delete cascade not null,
  to_user uuid references profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone default now()
);

-- 3. Tabla de mensajes
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  content text default '',
  file_url text,
  file_name text,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- =============================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- =============================================

-- Habilitar RLS en todas las tablas
alter table profiles enable row level security;
alter table friend_requests enable row level security;
alter table messages enable row level security;

-- Políticas para profiles
create policy "Los perfiles son visibles para todos los usuarios autenticados"
  on profiles for select
  to authenticated
  using (true);

create policy "Los usuarios pueden editar su propio perfil"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Los usuarios pueden crear su propio perfil"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Políticas para friend_requests
create policy "Los usuarios pueden ver sus solicitudes"
  on friend_requests for select
  to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());

create policy "Los usuarios pueden enviar solicitudes"
  on friend_requests for insert
  to authenticated
  with check (from_user = auth.uid());

create policy "Los usuarios pueden actualizar solicitudes que reciben"
  on friend_requests for update
  to authenticated
  using (to_user = auth.uid());

-- Políticas para messages
create policy "Los usuarios pueden ver sus mensajes"
  on messages for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Los usuarios pueden enviar mensajes"
  on messages for insert
  to authenticated
  with check (sender_id = auth.uid());

create policy "Los usuarios pueden marcar mensajes como leídos"
  on messages for update
  to authenticated
  using (receiver_id = auth.uid());

-- =============================================
-- STORAGE para archivos
-- =============================================
-- Crear un bucket llamado 'chat-files' en el dashboard de Supabase Storage
-- con las siguientes políticas:
--   - Authenticated users can upload
--   - Authenticated users can read

-- =============================================
-- FUNCIÓN para crear perfil automáticamente al registrarse
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que se ejecuta cuando un usuario nuevo se registra
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
