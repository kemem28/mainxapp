-- ============================================
-- Setup: Crear bucket de storage para archivos
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Crear el bucket 'chat-files' como público
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir a usuarios autenticados subir archivos
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- 3. Permitir lectura pública (para ver imágenes/archivos)
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-files');

-- 4. Permitir a usuarios actualizar sus propios archivos
CREATE POLICY "Allow users to update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Permitir a usuarios eliminar sus propios archivos
CREATE POLICY "Allow users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
