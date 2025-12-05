# Guía Rápida: Verificar que el Tracking de Brevo Funciona

## ✅ Checklist de Verificación

### 1. Verificar Configuración en Brevo

- [ ] El webhook está marcado como **"Active"** en Brevo
- [ ] La URL del webhook es correcta (pestaña "Destination"):
  ```
  https://sistema-adademia-de-futbol-tura.vercel.app/api/webhooks/brevo
  ```
- [ ] Los eventos están activos (pestaña "Events to sync"):
  - [x] Opened
  - [x] Unique opened
  - [x] Delivered
  - [x] Clicked
  - [x] Hard Bounced
  - [x] Soft Bounced
  - [x] Blocked
  - [x] Complaint

### 2. Verificar Variables de Entorno en Vercel

- [ ] `BREVO_WEBHOOK_SECRET` está configurada en Vercel
- [ ] El valor coincide con el secret del webhook en Brevo

### 3. Probar el Webhook

1. **Enviar un email de prueba**:
   - Ve al dashboard → Configuración → Correos
   - Envía un email de prueba a tu dirección

2. **Verificar los logs cuando se envía**:
   - Busca en los logs de Vercel: `📧 Email sent via Brevo`
   - Anota el `messageId` que se muestra

3. **Abrir el email**:
   - Abre el email en tu cliente de correo (Gmail, Outlook, etc.)
   - **Nota**: Algunos clientes bloquean el tracking por privacidad

4. **Verificar los logs del webhook**:
   - Busca en los logs de Vercel: `📧 [Webhook] Email opened event received`
   - Verifica que el `messageId` recibido coincida con el guardado

### 4. Verificar en la Base de Datos

Ejecuta esta consulta en Supabase para verificar que el tracking funciona:

```sql
SELECT 
  id,
  to_email,
  subject,
  sent_at,
  opened_at,
  brevo_email_id,
  CASE 
    WHEN opened_at IS NOT NULL THEN '✅ Abierto'
    WHEN delivered_at IS NOT NULL THEN '📬 Entregado'
    WHEN sent_at IS NOT NULL THEN '📤 Enviado'
    ELSE '⏳ Pendiente'
  END as estado
FROM email_queue
WHERE sent_at >= NOW() - INTERVAL '7 days'
ORDER BY sent_at DESC
LIMIT 20;
```

## 🔍 Diagnóstico de Problemas

### Problema: No se reciben eventos en el webhook

**Síntomas**: No ves logs `📧 Brevo webhook received:` en Vercel

**Soluciones**:
1. Verifica que la URL del webhook sea correcta y accesible
2. Verifica que el webhook esté marcado como "Active" en Brevo
3. Prueba hacer clic en "Test webhook" en Brevo (si está disponible)
4. Verifica que no haya un firewall bloqueando las peticiones de Brevo

### Problema: Se reciben eventos pero no se actualiza `opened_at`

**Síntomas**: Ves logs `📧 [Webhook] Email opened event received` pero `opened_at` sigue siendo NULL

**Posibles causas**:
1. El `messageId` no coincide entre lo guardado y lo recibido
2. El email no se encuentra en la base de datos

**Solución**:
1. Compara el `messageId` en los logs de envío con el recibido en el webhook
2. Verifica que el email esté en `email_queue` con el `brevo_email_id` correcto
3. Revisa los logs detallados que agregamos - deberían mostrar por qué no se encuentra el email

### Problema: El tracking no funciona en algunos clientes de correo

**Síntomas**: Algunos emails se marcan como abiertos, otros no

**Explicación**: 
- Gmail, Outlook y otros clientes bloquean el tracking por privacidad
- Esto es normal y esperado
- El tracking solo funciona si el cliente de correo carga el pixel de tracking

## 📊 Verificación Rápida

Ejecuta este comando para ver el estado del tracking:

```sql
-- Emails enviados en las últimas 24 horas
SELECT 
  COUNT(*) as total_enviados,
  COUNT(opened_at) as total_abiertos,
  ROUND(COUNT(opened_at)::numeric / COUNT(*)::numeric * 100, 2) as porcentaje_apertura
FROM email_queue
WHERE sent_at >= NOW() - INTERVAL '24 hours'
  AND status = 'sent';
```

## 🎯 Próximos Pasos

Si después de verificar todo lo anterior el tracking aún no funciona:

1. Revisa los logs detallados en Vercel
2. Compara los `messageId` entre envío y webhook
3. Verifica que el webhook esté recibiendo eventos (deberías ver logs incluso si no encuentra el email)
4. Si el webhook no recibe eventos, verifica la configuración en Brevo

