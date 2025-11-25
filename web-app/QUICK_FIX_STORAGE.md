# 🔧 Solución Rápida: Error "Bucket not found"

## Problema

Estás viendo el error:
```
{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}
```

Esto significa que el bucket `documents` no existe en Supabase Storage.

## ✅ Solución Rápida (2 minutos)

### Opción 1: Crear el bucket manualmente (Recomendado)

1. Ve a tu **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Storage** en el menú lateral
4. Click en **"New bucket"**
5. Configura:
   - **Name**: `documents`
   - **Public bucket**: ✅ **Marca esta casilla** (MUY IMPORTANTE)
   - **File size limit**: `50` MB
6. Click en **"Create bucket"**

### Opción 2: Usar el script automático

1. Asegúrate de tener `SUPABASE_SERVICE_ROLE_KEY` en tu `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

2. Ejecuta:
   ```bash
   npm run create-storage
   ```

3. Luego ejecuta las políticas RLS en Supabase SQL Editor (el script te dará las instrucciones)

## 🔐 Configurar Políticas RLS

Después de crear el bucket, ve a **Storage** → **Policies** y ejecuta esto en **SQL Editor**:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow public read access
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents');
```

## ✅ Verificar

1. Ve a **Storage** → **documents**
2. Deberías ver el bucket vacío
3. Intenta subir un archivo desde la aplicación
4. El error debería desaparecer

## 📝 Nota sobre archivos antiguos

Los archivos antiguos como `logo_academia.png` que están en la carpeta `public/` seguirán funcionando. El sistema ahora:
1. Primero busca en `public/` (para archivos antiguos)
2. Luego busca en Supabase Storage (para archivos nuevos)

---

**¿Aún tienes problemas?** Verifica que el bucket sea **público** (muy importante).

