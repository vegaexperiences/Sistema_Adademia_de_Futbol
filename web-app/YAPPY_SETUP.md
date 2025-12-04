# Configuración de Yappy Comercial

## Credenciales

- **ID del comercio**: `352eef93-b7d9-445b-a584-3915d9e27236`
- **Clave secreta**: `WVBfOTA1RUZDQjUtRDBEMS0zNTNFLTg4NDYtRjdBODU1N0QyQzZBLjM1MmVlZjkzLWI3ZDktNDQ1Yi1hNTg0LTM5MTVkOWUyNzIzNg==`
- **URL del dominio**: `sistema-adademia-de-futbol-tura.vercel.app`
- **Ambiente**: Pruebas (Testing)

## Variables de Entorno

Agrega estas variables en Vercel (Settings → Environment Variables):

```bash
YAPPY_MERCHANT_ID=352eef93-b7d9-445b-a584-3915d9e27236
YAPPY_SECRET_KEY=WVBfOTA1RUZDQjUtRDBEMS0zNTNFLTg4NDYtRjdBODU1N0QyQzZBLjM1MmVlZjkzLWI3ZDktNDQ1Yi1hNTg0LTM5MTVkOWUyNzIzNg==
YAPPY_ENVIRONMENT=testing
YAPPY_DOMAIN_URL=https://sistema-adademia-de-futbol-tura.vercel.app
```

**⚠️ IMPORTANTE sobre YAPPY_DOMAIN_URL:**
- El panel de Yappy Comercial **REQUIERE** registrar el dominio **CON** `https://` (ej: `https://sistema-adademia-de-futbol-tura.vercel.app`)
- El código automáticamente extrae solo el dominio (sin `https://`) cuando se envía a la API
- Puedes configurar `YAPPY_DOMAIN_URL` con o sin `https://` - el código lo manejará correctamente

## Endpoints API

- **Validar Merchant**: `/api/payments/yappy/validate` (POST)
- **Crear Orden**: `/api/payments/yappy/order` (POST)
- **Callback**: `/api/payments/yappy/callback` (POST/GET)

## Componente

El componente `YappyPaymentButton` carga automáticamente el web component de Yappy desde el CDN y maneja el flujo de pago completo.

## Puntos de Integración

1. **Enrollment (Público)**: `src/components/enrollment/steps/PaymentStep.tsx`
2. **Player Payment Section**: `src/components/payments/PlayerPaymentSection.tsx`
3. **Payment Form Inline**: `src/components/payments/PaymentFormInline.tsx`
4. **Create Payment Modal**: `src/components/payments/CreatePaymentModal.tsx`
5. **Create Payment**: `src/components/payments/CreatePayment.tsx`

## Flujo de Pago (Según Manual Oficial)

El flujo sigue exactamente el manual oficial de Yappy:

1. **Usuario selecciona Yappy** como método de pago
2. **Validar Merchant** (`/api/payments/yappy/validate`):
   - Llama a `/payments/validate/merchant` de Yappy
   - Obtiene `token` y `epochTime` (paymentDate)
3. **Crear Orden** (`/api/payments/yappy/order`):
   - Llama a `/payments/payment-wc` de Yappy usando el token
   - Obtiene `transactionId`, `token` (para frontend) y `documentName`
4. **Cargar Web Component**:
   - Se carga el web component de Yappy desde el CDN
   - Se inicializa con `merchant-id`, `token`, `document-name`, etc.
5. **Usuario completa el pago** en el componente de Yappy
6. **Yappy llama al callback** (`/api/payments/yappy/callback`) con:
   - `orderId`: ID de la orden
   - `hash`: Hash para validar
   - `status`: Estado (E=Ejecutado, R=Rechazado, C=Cancelado, X=Expirado)
   - `domain`: Dominio
   - `confirmationNumber`: ID de la transacción en Yappy
7. **Se crea registro de pago** en BD con `status: 'Approved'` (si status = 'E')
8. **Se envía email de confirmación**
9. **Se redirige a página de éxito**

## Configuración en Panel de Yappy Comercial

### Registrar Dominio

1. Accede a tu panel de Yappy Comercial
2. Ve a la sección de configuración del Botón de Pago
3. **Registra el dominio CON `https://`**: `https://sistema-adademia-de-futbol-tura.vercel.app`
   - ⚠️ El panel **REQUIERE** el `https://` - no puedes registrarlo sin él
   - El código automáticamente extraerá solo el dominio cuando se comunique con la API
4. Guarda la configuración

### Generar Credenciales

1. En el panel de Yappy, haz clic en **"Generar clave secreta"**
2. Copia las credenciales:
   - **ID de comercio** (merchantId)
   - **Clave secreta** (secretKey)
3. Configúralas en las variables de entorno de Vercel

### Verificar Configuración

Después de configurar, verifica que:
- ✅ El dominio esté registrado en el panel (con `https://`)
- ✅ El merchant ID esté activo
- ✅ La clave secreta esté generada
- ✅ Las variables de entorno estén configuradas en Vercel

## Endpoints de Yappy (Según Manual)

### Validar Merchant
- **Endpoint**: `/payments/validate/merchant` (POST)
- **Request**: `{ merchantId, urlDomain }` 
  - **Nota**: En ambiente de testing, `urlDomain` puede requerir `https://` (el código lo agrega automáticamente)
- **Response**: `{ status, body: { token, epochTime } }`
- **Vigencia del token**: 10 minutos

### Crear Orden
- **Endpoint**: `/payments/payment-wc` (POST)
- **Header**: `Authorization: {token}` (token de validación, sin prefijo "Bearer")
- **Request**: `{ merchantId, orderId, domain, paymentDate, ipnUrl, shipping, discount, taxes, subtotal, total }`
  - **Nota importante**: El campo `domain` debe ser solo el dominio (sin `https://`), diferente de `urlDomain` en validate/merchant
- **Response**: `{ status, body: { transactionId, token, documentName } }`

### Callback (IPN)
- **Endpoint**: Tu callback URL (configurado como `ipnUrl`)
- **Método**: GET
- **Parámetros**: `orderId`, `hash`, `status`, `domain`, `confirmationNumber`
- **Status**: E=Ejecutado, R=Rechazado, C=Cancelado, X=Expirado

## Troubleshooting

### Error: "Yappy no está disponible. El dominio podría no estar autorizado"

**Causas posibles:**
1. El dominio no está registrado en el panel de Yappy Comercial
2. El dominio está registrado incorrectamente (debe ser con `https://` en el panel)
3. El merchant ID no está activo
4. La clave secreta no está generada o configurada

**Soluciones:**
1. Verifica en el panel de Yappy que el dominio esté registrado **CON** `https://`
2. Verifica que el merchant ID en las variables de entorno coincida con el del panel
3. Verifica que la clave secreta esté generada y configurada correctamente
4. Revisa los logs del servidor para ver errores específicos de validación

### Error: "Token de validación requerido"

Este error indica que el flujo de validación no se completó. El componente debería validar automáticamente, pero si persiste:
1. Verifica que el endpoint `/api/payments/yappy/validate` esté funcionando
2. Revisa los logs para ver si hay errores en la validación
3. Verifica que las credenciales sean correctas

## Documentación

- [Documentación Oficial de Yappy](https://www.yappy.com.pa/comercial/desarrolladores/boton-de-pago-yappy-nueva-integracion/)
- Manual de Integración: "Yappy Web Component - Manual de Integración.pdf"

