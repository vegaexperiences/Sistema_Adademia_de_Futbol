# 🔧 Solución: Error "new row violates row-level security policy"

## Problema

Estás viendo el error:
```
StorageApiError: new row violates row-level security policy
```

Esto significa que las políticas RLS (Row Level Security) en Supabase Storage están bloqueando la subida de archivos.

## ✅ Solución Rápida (2 minutos)

### Paso 1: Ir a Supabase SQL Editor

1. Ve a tu **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral
4. Click en **"New query"**

### Paso 2: Ejecutar las Políticas RLS

Copia y pega este SQL completo en el editor:

```sql
-- Fix RLS policies for documents bucket
-- First, drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Policy 1: Allow authenticated users to INSERT (upload) files
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy 2: Allow authenticated users to UPDATE their files
CREATE POLICY "Allow authenticated updates" 
ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy 3: Allow public SELECT (read) access
CREATE POLICY "Allow public read" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'documents');

-- Policy 4: Allow authenticated users to DELETE files
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'documents');
```

### Paso 3: Ejecutar el Query

1. Click en **"Run"** o presiona `Ctrl+Enter` (Windows/Linux) o `Cmd+Enter` (Mac)
2. Deberías ver un mensaje de éxito: `Success. No rows returned`

### Paso 4: Verificar las Políticas

Para verificar que las políticas se crearon correctamente, ejecuta:

```sql
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%documents%' OR policyname LIKE '%authenticated%' OR policyname LIKE '%public%'
ORDER BY policyname;
```

Deberías ver 4 políticas listadas.

## ✅ Probar

1. Intenta subir un archivo desde la aplicación
2. El error debería desaparecer
3. El archivo debería subirse correctamente

## 🔍 Verificar el Bucket

Asegúrate de que el bucket "documents" esté configurado así:

1. Ve a **Storage** → **Buckets** → **documents**
2. Verifica que:
   - **Public bucket**: ✅ Marcado (SÍ)
   - **File size limit**: 50 MB (o el que necesites)
   - **Allowed MIME types**: `image/*, application/pdf` (o vacío para permitir todos)

## 📝 Notas

- Las políticas RLS son necesarias incluso si el bucket es público
- `authenticated` se refiere a usuarios que han iniciado sesión
- `public` permite acceso de lectura sin autenticación
- Si sigues teniendo problemas, verifica que el usuario esté autenticado correctamente

