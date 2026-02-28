-- ============================================
-- PATCH: Storage privado para chat-files
-- Ejecuta esto en el SQL Editor de Supabase
-- DESPUÉS de haber ejecutado supabase-setup.sql
-- ============================================

-- IMPORTANTE: En Supabase > Storage, asegúrate de que
-- el bucket "chat-files" esté configurado como PRIVATE (no Public)

-- Política: solo usuarios autenticados pueden subir archivos
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Usuarios autenticados pueden subir archivos',
  'chat-files',
  'INSERT',
  '(auth.role() = ''authenticated'')'
);

-- Política: solo participantes del chat pueden ver/descargar archivos
-- La carpeta de cada archivo es el conversation_id, así que validamos
-- que el usuario sea parte de esa conversación
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Solo participantes del chat pueden ver archivos',
  'chat-files',
  'SELECT',
  '(
    auth.role() = ''authenticated'' AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id::text = (string_to_array(name, ''/''))[1]
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  )'
);

-- Política: usuarios autenticados pueden eliminar sus propios archivos
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Usuarios pueden eliminar sus propios archivos',
  'chat-files',
  'DELETE',
  '(auth.role() = ''authenticated'')'
);

-- ============================================
-- ALTERNATIVA VISUAL (si prefieres hacerlo en el dashboard):
-- ============================================
-- 1. Ve a Storage > chat-files > Policies
-- 2. Agrega política INSERT: auth.role() = 'authenticated'
-- 3. Agrega política SELECT con la condición de conversación de arriba
-- ============================================
