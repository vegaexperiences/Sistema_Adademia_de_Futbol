# Instrucciones para Agregar Link de Pago a Plantilla de Recordatorio

## Paso 1: Ejecutar la Migración SQL

1. Ve a tu panel de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (en el menú lateral)
4. Haz clic en **New Query**
5. Copia y pega el contenido completo del archivo `migrations/update_payment_reminder_with_link.sql`
6. Haz clic en **Run** (o presiona `Ctrl/Cmd + Enter`)

## Paso 2: Verificar la Actualización

Después de ejecutar la migración, puedes verificar que la plantilla se actualizó correctamente:

```sql
SELECT 
  name,
  subject,
  variables,
  LENGTH(html_template) as template_length,
  html_template LIKE '%paymentLink%' as has_payment_link
FROM email_templates
WHERE name = 'payment_reminder';
```

Deberías ver:
- `has_payment_link` = `true`
- `template_length` > 2000 (indica que tiene el HTML completo)

## Paso 3: Probar la Plantilla

1. Ve a `/dashboard/emails/templates/[id]` donde `[id]` es el ID de la plantilla `payment_reminder`
2. Verifica que el botón "💳 Pagar Ahora" aparezca en la vista previa
3. El botón debe usar la variable `{{paymentLink}}`

## Nota Importante

La plantilla ahora incluye:
- ✅ Botón prominente "💳 Pagar Ahora" que usa `{{paymentLink}}`
- ✅ Variables actualizadas: `playerList`, `amount`, `dueDate`, `paymentLink`, `logoUrl`, `academy_name`, `current_year`
- ✅ Diseño mejorado y responsive

Cuando se envíe un correo usando esta plantilla, asegúrate de pasar la variable `paymentLink` con el formato:
```
https://sistema-adademia-de-futbol-tura.vercel.app/pay?cedula=8-1234-5678
```




