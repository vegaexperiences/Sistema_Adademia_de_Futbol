# Integración de Paguelo Fácil - Método Enlace de Pago

## ✅ Implementación Completada

La integración de Paguelo Fácil ha sido actualizada para usar el método **Enlace de Pago** (Payment Link) según la documentación oficial en https://developers.paguelofacil.com/guias/enlace-de-pago

### Cambios Realizados

1. **Servicio PagueloFacilService** (`src/lib/payments/paguelofacil.ts`)
   - ✅ Actualizado para usar `LinkDeamon.cfm` endpoint
   - ✅ Método `createPaymentLink()` implementado
   - ✅ Codificación hexadecimal de URLs para RETURN_URL
   - ✅ Soporte para parámetros personalizados (PARM_1, PARM_2, etc.)
   - ✅ Manejo de respuestas del servicio

2. **Endpoints API**
   - ✅ `/api/payments/paguelofacil/link` - Genera enlaces de pago
   - ✅ `/api/payments/paguelofacil/callback` - Maneja callbacks de Paguelo Fácil (RETURN_URL)
   - ✅ `/api/payments/paguelofacil/webhook` - Maneja webhooks de Paguelo Fácil (más confiable)
   - ✅ `/api/payments/paguelofacil` - Actualizado para compatibilidad

3. **Componentes Actualizados**
   - ✅ `PagueloFacilPaymentButton` - Nuevo componente de botón de pago con redirección
   - ✅ `PaymentStep` (enrollment) - Actualizado para usar redirección
   - ✅ `PaymentFormInline` - Actualizado para usar redirección
   - ✅ `PlayerPaymentSection` - Actualizado para usar redirección

4. **Flujo de Pago**

   ```
   Usuario → Selecciona Paguelo Fácil → Click en botón → 
   API genera enlace → Redirección a Paguelo Fácil → 
   Usuario paga → Callback → Registro automático de pago → 
   Redirección a página de éxito
   ```

### Configuración

**Variables de Entorno Requeridas:**
```bash
PAGUELOFACIL_CCLW=tu_codigo_web_aqui
PAGUELOFACIL_SANDBOX=true  # o false para producción
NEXT_PUBLIC_APP_URL=https://tu-dominio.com  # Para callbacks
```

### URLs de Ambientes

- **Sandbox**: `https://sandbox.paguelofacil.com/LinkDeamon.cfm`
- **Producción**: `https://secure.paguelofacil.com/LinkDeamon.cfm`

### Características

- ✅ Enlaces de pago seguros (offsite)
- ✅ Callback automático con RETURN_URL
- ✅ **Webhooks** para notificaciones en tiempo real (más confiables que callbacks)
- ✅ Creación automática de registros de pago
- ✅ Manejo de transacciones aprobadas y denegadas
- ✅ Redirección inteligente según tipo de pago (enrollment/payment)
- ✅ Parámetros personalizados para tracking
- ✅ Validación mejorada de transacciones (authStatus, status)
- ✅ Detección y logging de errores 3DS
- ✅ Validación de configuración de sandbox
- ✅ Soporte para parámetros opcionales (CARD_TYPE, PF_CF)

### Pendiente de Optimización

- El callback actual crea registros de pago automáticamente para pagos regulares
- Para enrollments, se necesita crear una página de éxito que complete el proceso
- Los componentes antiguos `PagueloFacilCheckout` y `PagueloFacilCheckoutInline` pueden eliminarse (ya no se usan)

## Configuración de Webhooks

Los webhooks son más confiables que los callbacks porque PagueloFacil los envía directamente al servidor. Se recomienda configurar webhooks además de los callbacks.

### Pasos para Configurar Webhooks

1. **Obtener la URL del Webhook:**
   ```
   https://tu-dominio.com/api/payments/paguelofacil/webhook
   ```

2. **Configurar en PagueloFacil:**
   - Accede al panel de administración de PagueloFacil
   - Ve a la sección de configuración de webhooks
   - Agrega la URL del webhook
   - Guarda la configuración

3. **Verificar que Funciona:**
   - Realiza una transacción de prueba
   - Revisa los logs del servidor para ver si el webhook fue recibido
   - Los webhooks aparecen en los logs con el prefijo `[PagueloFacil Webhook]`

### Diferencias entre Callbacks y Webhooks

| Característica | Callback (RETURN_URL) | Webhook |
|----------------|----------------------|---------|
| Método | GET con query params | POST con JSON body |
| Confiabilidad | Depende de redirección del usuario | Enviado directamente por PagueloFacil |
| Información | Parámetros básicos | Información completa (authStatus, status, etc.) |
| Cuándo se envía | Después de que el usuario es redirigido | Inmediatamente después de la transacción |

## Troubleshooting

### Problema: Transacciones Denegadas con Error 3DS

**Síntoma:** Las transacciones se deniegan con el mensaje:
```
"Issuer is rejecting authentication and requesting that authorization not be attempted"
```

**Posibles Causas:**
1. **Tarjetas de prueba incorrectas:** Asegúrate de usar las tarjetas de prueba correctas del sandbox
2. **Configuración de 3DS:** El comercio puede no tener 3DS configurado correctamente
3. **Credenciales incorrectas:** Verifica que estés usando credenciales del ambiente correcto (sandbox vs producción)

**Soluciones:**
1. **Verificar tarjetas de prueba:**
   - Usa las tarjetas de prueba oficiales de PagueloFacil para sandbox
   - Asegúrate de que las fechas de vencimiento sean válidas (mes/año >= actual)
   - CVV puede ser cualquier 3 dígitos

2. **Verificar configuración:**
   ```bash
   # Asegúrate de que estas variables estén configuradas correctamente
   PAGUELOFACIL_SANDBOX=true  # Para ambiente de pruebas
   PAGUELOFACIL_CCLW=tu_cclw_de_sandbox  # CCLW del ambiente de sandbox
   ```

3. **Revisar logs:**
   - Busca en los logs mensajes con `[PagueloFacil] ⚠️ 3DS Authentication Error`
   - Los logs indicarán si el problema es con la configuración o con las tarjetas

### Tarjetas de Prueba del Sandbox

Según la documentación oficial, estas son las tarjetas de prueba que deberían funcionar:

**VISA:**
- 4059310181757001
- 4916012776136988
- 4716040174085053
- 4143766247546688
- 4929019201087046

**Mastercard:**
- 5517747952039692
- 5451819737278230
- 5161216979741515
- 5372362326060103
- 5527316088871226

**Nota:** Cualquier fecha de vencimiento válida (mes/año >= actual) y cualquier CVV de 3 dígitos deberían funcionar.

### Verificar que el Webhook Funciona

1. **Revisar logs del servidor:**
   ```
   [PagueloFacil Webhook] ========== WEBHOOK RECEIVED ==========
   ```

2. **Verificar que se procesa correctamente:**
   ```
   [PagueloFacil Webhook] ✅ Webhook processed successfully
   ```

3. **Si no recibes webhooks:**
   - Verifica que la URL del webhook esté configurada correctamente en PagueloFacil
   - Asegúrate de que el servidor sea accesible desde internet (no localhost)
   - Revisa que no haya firewalls bloqueando las peticiones POST

### Validación de Transacciones

El sistema valida las transacciones usando múltiples criterios:

**En Callbacks:**
- `TotalPagado > 0` → Aprobada
- `Estado = "Aprobada"` → Aprobada
- `Estado = "Denegada"` → Denegada

**En Webhooks:**
- `status = 1` → Aprobada
- `authStatus = "00"` → Aprobada (código ISO del emisor)
- `totalPay > 0` → Aprobada
- `status = 0` → Denegada

## Parámetros Opcionales

### CARD_TYPE

Permite especificar qué métodos de pago mostrar en el enlace de pago:

```typescript
{
  cardType: 'CARD'  // Valores: NEQUI, CASH, CLAVE, CARD, CRYPTO
}
```

### PF_CF (Custom Fields)

Permite enviar campos personalizados en formato JSON codificado en hexadecimal:

```typescript
{
  pfCf: '5B7B226964223A227472616D6974654964222C226E616D654F724C6162656C223A2249642064656C205472616D697465222C2276616C7565223A2254494432333435227D5D'
}
```

## Documentación de Referencia

- Documentación oficial: https://developers.paguelofacil.com/guias/enlace-de-pago
- Método: POST a `LinkDeamon.cfm`
- Respuesta: JSON con `url` y `code` para redirección
- Webhooks: POST a tu endpoint con JSON body

