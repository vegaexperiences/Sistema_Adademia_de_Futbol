# Contacto con Soporte de Yappy - Error YAPPY-004

## Email para Soporte de Yappy

**Asunto:** Error YAPPY-004 al crear orden de pago - Solicitud de asistencia técnica

**Cuerpo del email:**

Elidate/merchant`):
   - ✅ Funciona correctamente
   - ✅ Retorna `status.code: '0000'` (Correct execution)
   - ✅ Obtiene `token` y `epochTime` (paymentDate) exitosamente

2. **Creación de Orden** (`/payments/payment-wc`):
   - ❌ Falla con error YAPPY-004stimado equipo de soporte de Yappy Comercial,

Les escribo para solicitar asistencia técnica con un error que estamos experimentando al integrar el botón de pago de Yappy en nuestra aplicación.

### Información del Comercio

- **ID del Comercio (Merchant ID):** `352eef93-b7d9-445b-a584-3915d9e27236`
- **Ambiente:** Testing (UAT)
- **Dominio registrado:** `https://sistema-adademia-de-futbol-tura.vercel.app`
- **Endpoint de validación:** `/payments/validate/merchant`
- **Endpoint de creación de orden:** `/payments/payment-wc`

### Problema Identificado

Estamos recibiendo el error **YAPPY-004** ("Error en el request o algun campo puede estar vacio") al intentar crear una orden de pago mediante el endpoint `/payments/payment-wc`, aunque todos los campos requeridos están presentes y con valores válidos.

### Flujo Implementado

1. **Validación del Merchant** (`/payments/va
   - Status HTTP: 400
   - `status.code: 'YAPPY-004'`
   - `status.description: 'Error en el request o algun campo puede estar vacio.'`

### Request Body Enviado

```json
{
  "merchantId": "352eef93-b7d9-445b-a584-3915d9e27236",
  "orderId": "payment-772b437",
  "domain": "sistema-adademia-de-futbol-tura.vercel.app",
  "paymentDate": 1764863668,
  "ipnUrl": "https://sistema-adademia-de-futbol-tura.vercel.app/api/payments/yappy/callback",
  "shipping": "0.00",
  "discount": "0.00",
  "taxes": "0.00",
  "subtotal": "130.00",
  "total": "130.00"
}
```

### Headers Enviados

```
Content-Type: application/json
Accept: application/json
Authorization: {token} (sin prefijo "Bearer")
```

### Validaciones Realizadas

Hemos verificado que:
- ✅ `merchantId`: Presente, 36 caracteres, no vacío
- ✅ `orderId`: Presente, 15 caracteres (máximo permitido), no vacío
- ✅ `domain`: Presente, 42 caracteres, sin `https://`, no vacío
- ✅ `paymentDate`: Presente, número (epochTime), no vacío
- ✅ `ipnUrl`: Presente, URL completa con `https://`, no vacío
- ✅ `shipping`: Presente, formato "0.00", no vacío
- ✅ `discount`: Presente, formato "0.00", no vacío
- ✅ `taxes`: Presente, formato "0.00", no vacío
- ✅ `subtotal`: Presente, formato "130.00", no vacío
- ✅ `total`: Presente, formato "130.00", no vacío
- ✅ `token`: Presente en header Authorization, obtenido de validación

### Variaciones Probadas

Hemos intentado múltiples variaciones sin éxito:

1. **paymentDate como string:** `"1764863668"` → Error YAPPY-004
2. **paymentDate como número:** `1764863668` → Error YAPPY-004
3. **Valores monetarios como strings:** `"0.00"`, `"130.00"` → Error YAPPY-004
4. **Valores monetarios como números:** `0.00`, `130.00` → Error YAPPY-004
5. **Orden de campos:** Variado según manual → Error YAPPY-004
6. **Authorization header:** Con y sin "Bearer" → Error YAPPY-004

### Preguntas Específicas

1. ¿Hay algún campo adicional requerido que no esté documentado en el manual?
2. ¿El formato del `domain` debe ser diferente (con/sin protocolo, con/sin www)?
3. ¿El `paymentDate` debe tener un formato específico diferente al epochTime?
4. ¿Hay alguna validación adicional en el ambiente de testing que no esté documentada?
5. ¿El `orderId` tiene alguna restricción de formato además del límite de 15 caracteres?
6. ¿Los valores monetarios deben tener un formato específico (decimales, separadores)?
7. ¿Hay algún problema conocido con el error YAPPY-004 en el ambiente de testing?

### Información Adicional

- **URL Base API:** `https://api-comecom-uat.yappycloud.com`
- **Token obtenido:** Válido (obtenido de `/payments/validate/merchant`)
- **Vigencia del token:** 10 minutos (según documentación)
- **Tiempo entre validación y creación de orden:** < 1 segundo

### Logs Completos

```
[Yappy] Validate merchant response: {
  status: 200,
  statusCode: '0000',
  statusDescription: 'Correct execution',
  hasToken: true,
  hasEpochTime: true
}

[Yappy] Payment-wc response: {
  status: 400,
  statusCode: 'YAPPY-004',
  statusDescription: 'Error en el request o algun campo puede estar vacio.',
  fullResponse: {
    status: {
      code: 'YAPPY-004',
      description: 'Error en el request o algun campo puede estar vacio.'
    }
  }
}
```

### Solicitud

Por favor, necesitamos:
1. Confirmación de los campos exactos requeridos para `/payments/payment-wc`
2. Ejemplo de request body que funcione correctamente
3. Cualquier validación adicional que debamos considerar
4. Si hay algún problema conocido con este error en el ambiente de testing

Quedamos atentos a su respuesta para poder completar la integración.

Saludos cordiales,
[Tu nombre]
[Tu empresa]
[Tu contacto]

---

## Mensaje de WhatsApp para Agente Bolívar

Hola Bolívar,

Te escribo porque estamos teniendo un problema con la integración del botón de pago de Yappy y necesitamos tu ayuda.

**El problema:**
Estamos recibiendo el error **YAPPY-004** ("Error en el request o algun campo puede estar vacio") al intentar crear una orden de pago, aunque todos los campos están presentes y con valores válidos.

**Lo que funciona:**
✅ La validación del merchant (`/payments/validate/merchant`) funciona perfectamente
✅ Obtenemos el token y el epochTime correctamente
✅ El dominio está registrado en el panel con `https://`

**Lo que no funciona:**
❌ La creación de orden (`/payments/payment-wc`) falla con YAPPY-004

**Datos del comercio:**
- Merchant ID: `352eef93-b7d9-445b-a584-3915d9e27236`
- Ambiente: Testing
- Dominio: `https://sistema-adademia-de-futbol-tura.vercel.app`

**Request que enviamos:**
```json
{
  "merchantId": "352eef93-b7d9-445b-a584-3915d9e27236",
  "orderId": "payment-772b437",
  "domain": "sistema-adademia-de-futbol-tura.vercel.app",
  "paymentDate": 1764863668,
  "ipnUrl": "https://sistema-adademia-de-futbol-tura.vercel.app/api/payments/yappy/callback",
  "shipping": "0.00",
  "discount": "0.00",
  "taxes": "0.00",
  "subtotal": "130.00",
  "total": "130.00"
}
```

**Header Authorization:** Solo el token (sin "Bearer")

**Lo que hemos probado:**
- paymentDate como string y como número
- Valores monetarios como strings y como números
- Diferentes órdenes de campos
- Verificamos que ningún campo esté vacío

**Preguntas:**
1. ¿Falta algún campo que no esté en el manual?
2. ¿El formato del dominio debe ser diferente?
3. ¿Hay alguna validación adicional en testing?
4. ¿Hay algún problema conocido con YAPPY-004?

¿Podrías ayudarnos a resolver esto? Necesitamos saber qué campo específico está causando el problema o si hay algún requisito adicional que no esté documentado.

Gracias de antemano,
[Tu nombre]

