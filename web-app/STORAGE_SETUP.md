# 📦 Configuración de Supabase Storage

## ✅ Pasos para Configurar el Bucket de Documentos

### 1. Crear el Bucket en Supabase

1. Ve a tu proyecto en **Supabase Dashboard**
2. Navega a **Storage** en el menú lateral
3. Click en **"New bucket"**
4. Configura el bucket:
   - **Name**: `documents`
   - **Public bucket**: ✅ **Sí** (marcar esta opción)
   - **File size limit**: `50 MB` (o el tamaño que necesites)
   - **Allowed MIME types**: Dejar vacío o agregar: `image/*, application/pdf`
5. Click en **"Create bucket"**

### 2. Configurar Políticas de Seguridad (RLS)

Después de crear el bucket, ve a **Storage** → **Policies** y crea las siguientes políticas:

#### Política 1: Permitir subida de archivos (autenticados)
```sql
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');
```

#### Política 2: Permitir lectura pública
```sql
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');
```

#### Política 3: Permitir actualización (autenticados)
```sql
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents');
```

#### Política 4: Permitir eliminación (autenticados)
```sql
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents');
```

### 3. Verificar Configuración

Para verificar que todo está configurado correctamente:

1. Ve a **Storage** → **documents**
2. Deberías ver el bucket vacío
3. Intenta subir un archivo de prueba desde la aplicación

## 🔧 Estructura de Archivos

Los archivos se organizan así en el bucket:

```
documents/
├── tutors/
│   └── {tutor_cedula}/
│       └── cedulaTutorFile-{timestamp}.{ext}
├── players/
│   └── {player_name}/
│       ├── cedulaFrontFile-{timestamp}.{ext}
│       └── cedulaBackFile-{timestamp}.{ext}
└── payments/
    └── proofs/
        └── {tutor_cedula}/
            └── proof-{timestamp}.{ext}
```

## 🧪 Prueba de Funcionamiento

1. Ve a la página de matrícula: `/enrollment`
2. Completa los pasos hasta llegar a "Documentos"
3. Sube un archivo de prueba
4. Deberías ver:
   - Indicador de carga mientras sube
   - Mensaje de éxito cuando termine
   - El archivo debería aparecer en Supabase Storage

## 🆘 Troubleshooting

### Error: "El bucket 'documents' no existe"

**Solución**: Crea el bucket siguiendo los pasos del punto 1.

### Error: "Permission denied" al subir

**Solución**: Verifica que las políticas RLS estén configuradas correctamente (punto 2).

### Error: "File too large"

**Solución**: Aumenta el límite de tamaño del archivo en la configuración del bucket.

### Los archivos no se muestran en el visor

**Solución**: 
1. Verifica que el bucket sea público
2. Verifica que la política de lectura pública esté activa
3. Revisa la consola del navegador para ver errores

## 📝 Notas Importantes

- **Bucket público**: Es necesario que el bucket sea público para que las imágenes se puedan mostrar sin autenticación
- **Límites**: Asegúrate de configurar límites apropiados de tamaño de archivo
- **Seguridad**: Aunque el bucket es público, solo usuarios autenticados pueden subir archivos gracias a las políticas RLS
- **Backup**: Considera hacer backups periódicos del bucket de Storage

## 🔄 Migración de Archivos Existentes

Si ya tienes archivos guardados como nombres de archivo (no URLs), necesitarás:

1. Subirlos manualmente a Supabase Storage
2. Actualizar las URLs en la base de datos
3. O crear un script de migración

---

**¿Necesitas ayuda?** Revisa la documentación de Supabase Storage o los logs de la aplicación.

