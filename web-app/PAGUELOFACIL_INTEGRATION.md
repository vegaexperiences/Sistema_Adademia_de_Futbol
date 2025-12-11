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

**Diagnóstico:**
1. ✅ **Credenciales verificadas:** El CCLW coincide con el proporcionado desde demo.paguelofacil.com
2. ✅ **Endpoint correcto:** Se está usando `https://sandbox.paguelofacil.com/LinkDeamon.cfm`
3. ✅ **Tarjetas de prueba:** Se están usando las tarjetas oficiales del sandbox
4. ⚠️ **Problema identificado:** Configuración de 3DS en el comercio sandbox

**Posibles Causas:**
1. **Configuración de 3DS en el comercio:** El comercio sandbox puede no tener 3DS configurado correctamente o puede estar habilitado cuando debería estar deshabilitado para tarjetas de prueba
2. **Credenciales incorrectas:** Aunque verificadas, asegúrate de que el CCLW en Vercel sea exactamente el mismo que el de demo.paguelofacil.com
3. **Variables de entorno:** Verifica que `PAGUELOFACIL_SANDBOX=true` esté configurado correctamente en Vercel

**Soluciones:**

1. **Verificar variables de entorno en Vercel:**
   - Ve a Settings → Environment Variables
   - Verifica que `PAGUELOFACIL_SANDBOX=true` (exactamente "true", no "True" ni "TRUE")
   - Verifica que `PAGUELOFACIL_CCLW` sea exactamente el mismo que el de demo.paguelofacil.com
   - Verifica que `PAGUELOFACIL_ACCESS_TOKEN` sea el correcto del sandbox

2. **Revisar logs detallados:**
   - Busca en los logs: `[PagueloFacil] ========== CONFIGURATION LOADED ==========`
   - Verifica que `sandbox: true` aparezca en los logs
   - Busca: `[PagueloFacil] ========== LINKDEAMON REQUEST ==========`
   - Revisa todos los parámetros enviados
   - Busca mensajes con `[PagueloFacil] ⚠️ 3DS Authentication Error`

3. **Contactar a PagueloFacil:**
   - Ver documento `PAGUELOFACIL_3DS_TROUBLESHOOTING.md` para mensaje completo
   - Solicitar verificación de configuración de 3DS en el comercio sandbox
   - Preguntar si 3DS debe estar deshabilitado para tarjetas de prueba
   - Solicitar orientación sobre cómo resolver el problema

4. **Alternativa técnica - Endpoint /AUTH:**
   - Según documentación, existe `LinkDeamon.cfm/AUTH` para pre-autorizar
   - Esto requeriría implementar un flujo de dos pasos (AUTH + CAPTURE)
   - Consultar con PagueloFacil si esto es necesario para evitar problemas de 3DS

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

**Nota:** Si especificas `CARD`, solo se mostrarán opciones de tarjeta de crédito/débito, lo que podría ayudar a evitar problemas con otros métodos de pago.

### PF_CF (Custom Fields)

Permite enviar campos personalizados en formato JSON codificado en hexadecimal:

```typescript
{
  pfCf: '5B7B226964223A227472616D6974654964222C226E616D654F724C6162656C223A2249642064656C205472616D697465222C2276616C7565223A2254494432333435227D5D'
}
```

### Parámetros Adicionales Investigados

Según la documentación y el análisis del código, estos son todos los parámetros disponibles:

**Requeridos:**
- `CCLW`: Código Web del comercio
- `CMTN`: Monto de la transacción
- `CDSC`: Descripción (máx. 150 caracteres)

**Opcionales:**
- `RETURN_URL`: URL de retorno codificada en hexadecimal
- `EMAIL`: Email del cliente
- `EXPIRES_IN`: Tiempo de expiración en segundos (default: 3600)
- `PARM_1` a `PARM_N`: Parámetros personalizados (máx. 150 caracteres cada uno)
- `CARD_TYPE`: Filtro de métodos de pago (NEQUI,CASH,CLAVE,CARD,CRYPTO)
- `PF_CF`: Campos personalizados en JSON codificado en hexadecimal
- `CTAX`: Monto del ITBMS (opcional)

**Nota sobre parámetros de sandbox:**
- No se encontró un parámetro específico para indicar que es sandbox
- El ambiente se determina por la URL del endpoint y las credenciales (CCLW)
- Si PagueloFacil indica que hay parámetros adicionales para sandbox, se pueden agregar fácilmente

## Problema Conocido: Error 3DS en Sandbox

### Error: "Issuer is rejecting authentication and requesting that authorization not be attempted"

**Estado actual (04/12/2025):**
- El flujo de 3DS se completa correctamente (se abre la ventana de 3DS y se ingresa la clave)
- Sin embargo, la transacción sigue siendo rechazada por el emisor
- Esto indica un problema de configuración del comercio sandbox, no del código

**Tarjeta de prueba específica para 3DS (proporcionada por PagueloFacil):**
- **Tarjeta:** `4012000000020006`
- **Clave 3DS:** `3ds2`

**Acción requerida:**
- Contactar a PagueloFacil para verificar la configuración del comercio sandbox para transacciones con 3DS
- Ver documentación completa en `PAGUELOFACIL_3DS_TROUBLESHOOTING.md`

## Endpoint Alternativo: /AUTH

Según la documentación, existe un endpoint alternativo para pre-autorizar:

```
https://sandbox.paguelofacil.com/LinkDeamon.cfm/AUTH
```

Este endpoint permite:
- Pre-autorizar una transacción
- Capturar después en un paso separado

**Cuándo usar:**
- Si PagueloFacil recomienda usar este endpoint para evitar problemas de 3DS
- Si necesitas más control sobre el proceso de autorización

**Implementación requerida:**
- Modificar `createPaymentLink()` para usar el endpoint `/AUTH`
- Implementar endpoint para capturar después de la autorización
- Manejar el flujo de dos pasos en el frontend

**Nota:** Consultar con PagueloFacil antes de implementar, ya que requiere cambios significativos en el código.

## Logging y Debugging

El sistema incluye logging detallado para facilitar el debugging:

### Logs de Configuración
```
[PagueloFacil] ========== CONFIGURATION LOADED ==========
```
Muestra la configuración cargada, incluyendo sandbox mode, previews de credenciales, y URLs.

### Logs de Solicitud
```
[PagueloFacil] ========== LINKDEAMON REQUEST ==========
```
Muestra todos los parámetros enviados a LinkDeamon (sin exponer credenciales completas por seguridad).

### Logs de Respuesta
```
[PagueloFacil] ========== LINKDEAMON RESPONSE ==========
```
Muestra la respuesta completa de LinkDeamon, incluyendo status, headers, y contenido.

### Logs de Errores 3DS
```
[PagueloFacil] ⚠️ 3DS Authentication Error detected
```
Aparece cuando se detecta un error relacionado con 3DS.

## Documentación de Referencia

- Documentación oficial: https://developers.paguelofacil.com/guias/enlace-de-pago
- Método: POST a `LinkDeamon.cfm`
- Respuesta: JSON con `url` y `code` para redirección
- Webhooks: POST a tu endpoint con JSON body
- Endpoint alternativo: `LinkDeamon.cfm/AUTH` para pre-autorización

