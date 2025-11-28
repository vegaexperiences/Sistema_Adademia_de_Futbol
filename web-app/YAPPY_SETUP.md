# Configuración de Yappy Comercial

## Credenciales

- **ID del comercio**: `1aad55ae-d1bc-49d6-bed2-4de16d69759d`
- **Clave secreta**: `WVBfM0E4QkJDNzQtRDFDNi0zMEMwLTkxNzEtOEI1ODlDRUU4NUU4LjFhYWQ1NWFlLWQxYmMtNDlkNi1iZWQyLTRkZTE2ZDY5NzU5ZA==`
- **URL del dominio**: `sistema-adademia-de-futbol-tura.vercel.app`
- **Ambiente**: Producción

## Variables de Entorno

Agrega estas variables en Vercel (Settings → Environment Variables):

```bash
YAPPY_MERCHANT_ID=1aad55ae-d1bc-49d6-bed2-4de16d69759d
YAPPY_SECRET_KEY=WVBfM0E4QkJDNzQtRDFDNi0zMEMwLTkxNzEtOEI1ODlDRUU4NUU4LjFhYWQ1NWFlLWQxYmMtNDlkNi1iZWQyLTRkZTE2ZDY5NzU5ZA==
YAPPY_ENVIRONMENT=production
YAPPY_DOMAIN_URL=sistema-adademia-de-futbol-tura.vercel.app
```

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

## Flujo de Pago

1. Usuario selecciona Yappy como método de pago
2. Se crea una orden de pago en `/api/payments/yappy/order`
3. Se carga el web component de Yappy desde el CDN
4. Usuario completa el pago en el componente de Yappy
5. Yappy llama al callback `/api/payments/yappy/callback`
6. Se crea registro de pago en BD con `status: 'Approved'`
7. Se envía email de confirmación
8. Se redirige a página de éxito

## Documentación

- [Documentación Oficial de Yappy](https://www.yappy.com.pa/comercial/desarrolladores/boton-de-pago-yappy-nueva-integracion/)

