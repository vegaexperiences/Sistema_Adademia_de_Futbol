# Troubleshooting Error 3DS en PagueloFacil Sandbox

## Problema Identificado

**Error:** "Issuer is rejecting authentication and requesting that authorization not be attempted"

**Contexto:**
- Ambiente: Sandbox (demo.paguelofacil.com)
- Método: Enlace de Pago (LinkDeamon.cfm)
- Tarjetas de prueba: Las oficiales proporcionadas por PagueloFacil
- Credenciales: Verificadas y correctas ✅
- Endpoint: `https://sandbox.paguelofacil.com/LinkDeamon.cfm`

## Alternativas Investigadas

### 1. **Verificar Configuración del Comercio en PagueloFacil** ⭐ (MÁS PROBABLE)

**Problema:** El comercio sandbox podría no tener 3DS configurado correctamente o podría estar habilitado cuando debería estar deshabilitado para tarjetas de prueba.

**Acción:** Contactar a PagueloFacil para verificar/habilitar/deshabilitar 3DS según sea necesario.

### 2. **Usar Endpoint Alternativo `/AUTH`**

Según la documentación, existe el endpoint `LinkDeamon.cfm/AUTH` para pre-autorizar y capturar en procesos separados. Esto podría evitar problemas de 3DS.

**Implementación requerida:**
- Paso 1: Llamar a `/AUTH` para pre-autorizar
- Paso 2: Llamar a `/CAPTURE` para capturar el pago

**Nota:** Esto requeriría cambios significativos en el código actual.

### 3. **Agregar Parámetros Adicionales**

Revisar si hay parámetros que indiquen que es sandbox o que deshabiliten 3DS:
- Verificar si existe un parámetro `SANDBOX=true` o similar
- Verificar si hay parámetros específicos para deshabilitar 3DS

### 4. **Verificar Configuración de Tarjetas de Prueba**

Algunas tarjetas de prueba pueden requerir configuración especial:
- Verificar si las tarjetas de prueba necesitan 3DS deshabilitado
- Confirmar que las tarjetas listadas son las correctas para el sandbox actual

### 5. **Contactar Soporte de PagueloFacil**

Esta es la solución más directa, ya que el problema parece ser de configuración del lado de PagueloFacil, no de nuestro código.

---

## Mensaje para PagueloFacil

### Asunto:
**Problema con autenticación 3DS en ambiente Sandbox - Error al procesar transacciones de prueba**

### Cuerpo del mensaje:

Estimado equipo de soporte de PagueloFacil,

Estoy experimentando un problema con la autenticación 3DS en el ambiente **Sandbox/Demo** al intentar procesar transacciones usando el método **Enlace de Pago** (LinkDeamon).

**Detalles del problema:**

1. **Ambiente:** Sandbox (demo.paguelofacil.com)
2. **Método de integración:** Enlace de Pago (LinkDeamon.cfm)
3. **Endpoint utilizado:** `https://sandbox.paguelofacil.com/LinkDeamon.cfm`
4. **Credenciales:**
   - CCLW: `89822261C0492FDD6002241759749115F007DED59668AD80232983B02DCE0C7041C2C0533E64A9C964B0486E72DA91B9D4B223DDC562A2D4B142B5C8B252764E`
   - Access Token: `brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRehyFxpNPHswNnHdmv6umjY`
   - Ambos obtenidos desde demo.paguelofacil.com

5. **Tarjetas de prueba utilizadas:**
   - VISA: 4059310181757001, 4916012776136988, 4716040174085053, 4143766247546688, 4929019201087046
   - Mastercard: 5517747952039692, 5451819737278230, 5161216979741515, 5372362326060103, 5527316088871226
   - Todas con fechas de vencimiento válidas y CVV de 3 dígitos

6. **Error recibido:**
   ```
   Estado: Denegada
   Razon: "Issuer is rejecting authentication and requesting that authorization not be attempted"
   TotalPagado: 0
   ```

7. **Parámetros enviados en la solicitud:**
   - CCLW: [el código web del sandbox]
   - CMTN: [monto, ej: 100.00]
   - CDSC: [descripción]
   - RETURN_URL: [URL codificada en hexadecimal]
   - EXPIRES_IN: 3600
   - PARM_1, PARM_2, etc.: [parámetros personalizados]

**Lo que he verificado:**

✅ Las credenciales son correctas y del ambiente sandbox
✅ El endpoint utilizado es el correcto para sandbox
✅ Las tarjetas de prueba son las oficiales proporcionadas en la documentación
✅ El referer en los callbacks muestra `sandbox.paguelofacil.com`
✅ La integración sigue la documentación oficial de Enlace de Pago

**Preguntas específicas:**

1. ¿El comercio sandbox tiene 3DS configurado? Si es así, ¿está configurado correctamente para trabajar con tarjetas de prueba?

2. ¿Es necesario deshabilitar 3DS en el ambiente sandbox para que las tarjetas de prueba funcionen correctamente?

3. ¿Existe algún parámetro adicional que deba enviar en la solicitud a LinkDeamon para indicar que es sandbox o para deshabilitar 3DS?

4. ¿Las tarjetas de prueba listadas requieren alguna configuración especial en el comercio?

5. ¿Hay algún problema conocido con 3DS en el ambiente sandbox que pueda estar afectando las transacciones?

**Información adicional:**

- El código de operación generado es: `LK-L57RAUF0JT64` (ejemplo de una transacción fallida)
- El tipo de tarjeta usado fue: VISA
- El monto de prueba fue: $100.00 USD

**Solicitud:**

Por favor, podrían:
1. Verificar la configuración de 3DS en el comercio sandbox
2. Confirmar si 3DS debe estar habilitado o deshabilitado para tarjetas de prueba
3. Proporcionar orientación sobre cómo resolver este problema

Agradezco de antemano su ayuda y quedo atento a su respuesta.

Saludos cordiales,
[Tu nombre]
[Tu información de contacto]

---

## Alternativas Técnicas (Si PagueloFacil no puede resolver)

### Opción A: Implementar flujo AUTH + CAPTURE

Si PagueloFacil confirma que debemos usar el endpoint `/AUTH`, necesitaríamos:

1. Modificar `createPaymentLink()` para usar `LinkDeamon.cfm/AUTH`
2. Implementar un endpoint para capturar después de la autorización
3. Manejar el flujo de dos pasos en el frontend

**Complejidad:** Media-Alta
**Tiempo estimado:** 2-3 horas

### Opción B: Agregar parámetros de configuración

Si PagueloFacil indica que hay parámetros adicionales:

1. Agregar los parámetros a la interfaz `PagueloFacilTransaction`
2. Incluirlos en la solicitud POST a LinkDeamon
3. Documentar su uso

**Complejidad:** Baja
**Tiempo estimado:** 30 minutos

### Opción C: Esperar respuesta de PagueloFacil

**Recomendación:** Esta es la mejor opción, ya que el problema parece ser de configuración del lado de PagueloFacil, no de nuestro código.

---

## Checklist de Verificación

Antes de contactar a PagueloFacil, verifica:

- [x] Credenciales son del sandbox
- [x] Endpoint es el correcto para sandbox
- [x] Tarjetas de prueba son las oficiales
- [x] Parámetros enviados son correctos según documentación
- [x] RETURN_URL está codificado en hexadecimal
- [ ] Variables de entorno en Vercel están configuradas correctamente
- [ ] PAGUELOFACIL_SANDBOX=true está configurado

---

## Próximos Pasos

1. **Inmediato:** Enviar el mensaje a PagueloFacil
2. **Mientras esperas respuesta:** Verificar que todas las variables de entorno en Vercel estén correctas
3. **Si PagueloFacil confirma problema de configuración:** Seguir sus instrucciones
4. **Si PagueloFacil sugiere cambios técnicos:** Implementar según sus recomendaciones

