# Configuración de Paguelo Fácil

## Variables de Entorno

Agrega las siguientes variables de entorno a tu archivo `.env.local`:

```bash
# Paguelo Fácil Configuration
PAGUELOFACIL_ACCESS_TOKEN=brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRtCYPjVUZmYa6DGdGWCgkKp
PAGUELOFACIL_CCLW=C7881194DD86A8C5DA79A3BED569A63996C510BCC4A545892457B0BF7097F356498010C6071E3F663B5625E1F5ACC9331F1614876E3F4DFD6490735BBF7F6966
PAGUELOFACIL_SANDBOX=false
```

**Para producción en Vercel:**
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las tres variables arriba para todos los ambientes (Production, Preview, Development)

## Características Implementadas

1. **Servicio de Paguelo Fácil** (`src/lib/payments/paguelofacil.ts`)
   - Integración con el SDK de JavaScript de Paguelo Fácil
   - Soporte para sandbox y producción
   - Manejo de transacciones y verificación de pagos

2. **Componente de Checkout** (`src/components/payments/PagueloFacilCheckout.tsx`)
   - Modal de pago integrado
   - Carga dinámica del SDK de Paguelo Fácil
   - Manejo de estados de carga y errores
   - UI responsiva y moderna

3. **Endpoint API** (`src/app/api/payments/paguelofacil/route.ts`)
   - GET: Obtiene la configuración del SDK para el cliente
   - POST: Crea una nueva transacción

4. **Integración en el Sistema de Pagos**
   - Opción "Paguelo Fácil" agregada como método de pago
   - Disponible en:
     - Modal de creación de pagos (`CreatePaymentModal`)
     - Formulario de pagos (`CreatePayment`)
   - El pago se registra automáticamente después de una transacción exitosa

## Flujo de Pago

1. Usuario selecciona "Paguelo Fácil" como método de pago
2. El sistema obtiene la configuración del API
3. Se abre el modal de checkout de Paguelo Fácil
4. El SDK de Paguelo Fácil se carga dinámicamente
5. Usuario completa el pago en el formulario de Paguelo Fácil
6. Al completar exitosamente:
   - Se registra el pago en la base de datos
   - Se actualiza el estado del jugador
   - Se muestra un mensaje de éxito

## Notas

- El SDK de Paguelo Fácil se carga desde `https://secure.paguelofacil.com` (producción) o `https://sandbox.paguelofacil.com` (sandbox)
- Las transacciones exitosas incluyen el Transaction ID en las notas del pago
- El email del tutor se usa para identificar al cliente en Paguelo Fácil

## Testing

Para probar en modo sandbox, cambia `PAGUELOFACIL_SANDBOX=true` en `.env.local`.

Tarjetas de prueba (para sandbox):
- Visa: `4059310181757001`
- MasterCard: `5517747952039692`
- Clave: `6394240621480747` (CVV: 570, Fecha: 04/24, PIN: 0482)

