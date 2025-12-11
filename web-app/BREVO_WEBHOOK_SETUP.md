# Configuración del Webhook de Brevo para Tracking de Correos

## Problema

El tracking de aperturas de correos en Brevo no funciona si el webhook no está configurado correctamente en el panel de Brevo.

## Solución: Configurar Webhook en Brevo

### Paso 1: Acceder al Panel de Brevo

1. Inicia sesión en tu cuenta de Brevo: https://app.brevo.com
2. Ve a **Settings** → **Webhooks** (o **Configuración** → **Webhooks**)

### Paso 2: Crear un Nuevo Webhook

1. Haz clic en **"Add a webhook"** o **"Agregar webhook"**
2. Configura el webhook con los siguientes datos:

   - **URL del webhook**: 
     ```
     https://tu-dominio.vercel.app/api/webhooks/brevo
     ```
     Reemplaza `tu-dominio.vercel.app` con tu dominio real de Vercel.

   - **Descripción**: "Tracking de correos - Sistema de Control de Fútbol"

   - **Eventos a suscribir**: Selecciona los siguientes eventos:
     - ✅ **opened** (Email abierto)
     - ✅ **unique_opened** (Primera vez que se abre el email)
     - ✅ **delivered** (Email entregado)
     - ✅ **click** (Link clickeado)
     - ✅ **bounce** (Email rebotado)
     - ✅ **hardBounce** (Rebote duro)
     - ✅ **softBounce** (Rebote suave)
     - ✅ **spam** (Marcado como spam)
     - ✅ **blocked** (Email bloqueado)

### Paso 3: Configurar el Secret del Webhook

1. Brevo generará un **Webhook Secret** (clave secreta)
2. Copia este secret
3. Agrega este secret como variable de entorno en Vercel:
   - Variable: `BREVO_WEBHOOK_SECRET`
   - Valor: El secret que copiaste de Brevo

### Paso 4: Verificar que el Webhook Funciona

1. Brevo enviará una petición de prueba (evento `request`) al webhook
2. Verifica en los logs de Vercel que el webhook recibió la petición
3. El endpoint `/api/webhooks/brevo` debe responder con `{ received: true, processed: 1 }`

### Paso 5: Probar el Tracking

1. Envía un email de prueba desde el sistema
2. Abre el email en tu cliente de correo
3. Verifica en los logs de Vercel que se recibió el evento `opened`
4. Verifica en la base de datos que el campo `opened_at` se actualizó en la tabla `email_queue`

## Verificación del Tracking

### Paso 1: Verificar la URL del Webhook

En la pestaña **"Destination"** del webhook en Brevo, verifica que la URL sea:
```
https://sistema-adademia-de-futbol-tura.vercel.app/api/webhooks/brevo
```

O si tienes un dominio personalizado:
```
https://tu-dominio.com/api/webhooks/brevo
```

**Importante**: La URL debe ser accesible públicamente (no localhost) y debe usar HTTPS.

### Paso 2: Verificar que el Webhook Recibe Eventos

1. Ve a los logs de Vercel: https://vercel.com/dashboard → Tu proyecto → Logs
2. Busca logs que comiencen con `📧 Brevo webhook received:` - esto indica que el webhook está recibiendo eventos
3. Si no ves estos logs, el webhook no está recibiendo eventos de Brevo

### Paso 3: Verificar Eventos de Apertura

Busca logs que comiencen con `📧 [Webhook] Email opened event received:` para ver los eventos de apertura:

```
📧 [Webhook] Email opened event received: { event: 'opened', messageId: '...', ... }
📧 [Webhook] ✅ Email opened (exact match with brevo_email_id): { ... }
```

Si ves `📧 [Webhook] ❌ Could not find email`, significa que el messageId no coincide.

### En la Base de Datos

Verifica que el campo `opened_at` se actualice cuando se abre un email:

```sql
SELECT id, to_email, subject, sent_at, opened_at, brevo_email_id
FROM email_queue
WHERE opened_at IS NOT NULL
ORDER BY opened_at DESC
LIMIT 10;
```

## Troubleshooting

### El webhook no recibe eventos

1. **Verifica la URL del webhook**: Debe ser accesible públicamente (no localhost)
2. **Verifica que el webhook esté activo**: En el panel de Brevo, el webhook debe estar marcado como "Active"
3. **Verifica los eventos suscritos**: Asegúrate de que "opened" esté seleccionado
4. **Verifica los logs de Vercel**: Busca errores 401 (signature inválida) o 500 (error del servidor)

### El messageId no coincide

1. **Verifica los logs cuando se envía el email**: Busca `📧 Email sent via Brevo` para ver el messageId guardado
2. **Verifica los logs del webhook**: Busca `📧 [Webhook] Email opened event received` para ver el messageId recibido
3. **Compara los messageIds**: Deben ser iguales (o el webhook intentará hacer matching parcial)

### El email no se encuentra en la base de datos

1. **Verifica que el email se guardó correctamente**: Busca en `email_queue` por `to_email` y `sent_at`
2. **Verifica que el `brevo_email_id` se guardó**: El campo debe tener el messageId de Brevo
3. **Revisa los logs de envío**: Busca `✅ Email queue updated successfully` para confirmar que se guardó

## Notas Importantes

- El tracking de aperturas funciona mediante un pixel de 1x1 que Brevo inserta automáticamente en los emails HTML
- Algunos clientes de correo bloquean el tracking por privacidad (Gmail, Outlook, etc.)
- El tracking solo funciona si el email se envía a través de la API de Brevo (no desde el panel de Brevo)
- El webhook debe estar configurado **antes** de enviar los emails para que el tracking funcione

## Referencias

- [Documentación de Webhooks de Brevo](https://developers.brevo.com/docs/webhooks-2)
- [API de Transactional Emails de Brevo](https://developers.brevo.com/docs/send-transactional-emails)

