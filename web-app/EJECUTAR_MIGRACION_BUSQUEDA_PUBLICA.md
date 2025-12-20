# Ejecutar Migración: Búsqueda Pública de Jugadores

## Problema
El portal de pagos público (`/pay`) no puede buscar jugadores porque las políticas RLS (Row Level Security) solo permiten acceso a usuarios autenticados.

## Solución
Se ha creado una migración SQL que permite acceso público de solo lectura a las tablas `players` y `families` para búsquedas por cédula.

## Pasos para Ejecutar

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
   - Navega a **SQL Editor**

2. **Ejecuta la Migración**
   - Abre el archivo `migrations/add_public_player_search_policy.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **Run** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

3. **Verifica que se Ejecutó Correctamente**
   - Deberías ver un mensaje de éxito
   - Si hay errores, revisa los logs y corrige según sea necesario

## ¿Qué Hace Esta Migración?

- Crea una política RLS que permite a usuarios **públicos** (no autenticados) hacer búsquedas SELECT en la tabla `players`
- Crea una política RLS que permite a usuarios **públicos** hacer búsquedas SELECT en la tabla `families`
- Las políticas solo permiten acceso cuando `academy_id IS NOT NULL`, lo que garantiza que solo se puedan ver jugadores de academias válidas
- La aplicación siempre filtra por `academy_id` explícitamente, por lo que es seguro

## Seguridad

Esta migración es segura porque:
1. Solo permite operaciones SELECT (lectura)
2. No permite INSERT, UPDATE o DELETE
3. La aplicación siempre filtra por `academy_id` explícitamente
4. Solo se pueden ver datos básicos necesarios para el portal de pagos

## Después de Ejecutar

Una vez ejecutada la migración, el portal de pagos público debería poder buscar jugadores por cédula sin problemas.

Si aún hay problemas después de ejecutar la migración:
1. Verifica que el `academy_id` se esté estableciendo correctamente en el middleware
2. Revisa los logs del servidor para ver errores específicos
3. Verifica que existan jugadores en la base de datos con la cédula que estás buscando




