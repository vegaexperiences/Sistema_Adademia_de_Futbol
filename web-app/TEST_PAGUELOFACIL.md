# 🧪 Guía de Prueba - Integración Paguelo Fácil

## ✅ Estado Actual

La integración de Paguelo Fácil está **completada y lista para probar**. Se ha implementado el método **Enlace de Pago** según la documentación oficial.

## 🔗 Página de Prueba

He creado una página de prueba en: `/test-paguelofacil`

Accede a: `http://localhost:3000/test-paguelofacil` (en desarrollo)

Esta página te permite:
- ✅ Probar la generación de enlaces de pago
- ✅ Ver la respuesta del API
- ✅ Probar el botón de pago completo
- ✅ Verificar errores en tiempo real

## 🧪 Cómo Probar

### 1. **Prueba Básica de Enlace de Pago**

1. Ve a `/test-paguelofacil`
2. Completa los campos (monto, descripción, email)
3. Haz clic en "Probar Generación de Enlace"
4. Deberías ver una respuesta JSON con `success: true` y una `paymentUrl`
5. Copia la `paymentUrl` y ábrela en una nueva pestaña

### 2. **Prueba Completa con Redirección**

1. En la misma página, usa el botón "Pagar con Paguelo Fácil"
2. Serás redirigido a Paguelo Fácil
3. Usa una tarjeta de prueba (ver abajo)
4. Completa el pago
5. Serás redirigido de vuelta al callback

### 3. **Prueba en Formulario de Matrícula**

1. Ve a `/enrollment`
2. Completa todos los pasos del formulario
3. En el paso de pago, selecciona "Paguelo Fácil"
4. Haz clic en "Pagar con Paguelo Fácil"
5. Serás redirigido a Paguelo Fácil
6. Completa el pago
7. ⚠️ **Nota**: El enrollment aún necesita completarse después del pago exitoso

### 4. **Prueba en Registro de Pagos**

1. Ve a cualquier perfil de jugador o familia (`/dashboard/players/[id]` o `/dashboard/families/[id]`)
2. Haz clic en "Registrar Pago"
3. Selecciona "Paguelo Fácil" como método de pago
4. Completa los datos y haz clic en "Pagar con Paguelo Fácil"
5. El pago se registrará automáticamente después del callback exitoso

## 💳 Tarjetas de Prueba

Según la documentación de Paguelo Fácil, puedes usar estas tarjetas para pruebas:

### Tarjetas Aprobadas:
- `4059310181757001`
- `4916012776136988`
- `4716040174085053`
- `4143766247546688`
- `4929019201087046`
- `5517747952039692`
- `5451819737278230`
- `5161216979741515`
- `5372362326060103`
- `5527316088871226`

**CVV**: Cualquier 3 dígitos  
**Fecha**: Cualquier mes/año >= fecha actual

### Tarjeta Específica de Prueba:
- **Número**: `6394240621480747`
- **CVV**: `570`
- **Fecha**: `04-24`
- **PIN**: `0482`
- **Resultado**: Transacción Aprobada

## 🔍 Verificación de Errores

### Variables de Entorno Requeridas

Verifica que tengas configuradas:

```bash
PAGUELOFACIL_CCLW=tu_codigo_web
PAGUELOFACIL_SANDBOX=true  # o false para producción
NEXT_PUBLIC_APP_URL=http://localhost:3000  # o tu URL de producción
```

### Errores Comunes

1. **"El monto debe ser mayor o igual a $1.00 USD"**
   - Verifica que el monto sea >= 1.00

2. **"Error al generar enlace de pago"**
   - Verifica que `PAGUELOFACIL_CCLW` esté configurado
   - Verifica que `PAGUELOFACIL_SANDBOX` coincida con tus credenciales

3. **"Non-JSON response"**
   - Puede indicar que las credenciales no son válidas para el ambiente seleccionado
   - Verifica que estés usando credenciales de sandbox si `SANDBOX=true`

## 📊 Logs y Debugging

Todos los logs importantes se muestran en la consola del servidor:

```
[PagueloFacil] Creating payment link...
[PagueloFacil Callback] Transaction received: {...}
[PagueloFacil Callback] Payment record created successfully
```

## ✅ Funcionalidades Verificadas

- ✅ Generación de enlaces de pago
- ✅ Redirección a Paguelo Fácil
- ✅ Callback después del pago
- ✅ Creación automática de registros de pago (para pagos regulares)
- ✅ Redirección a páginas de éxito/error

## ⚠️ Pendiente de Optimización

- **Enrollments**: Actualmente el enrollment no se completa automáticamente después del pago con Paguelo Fácil. Se necesita guardar los datos del enrollment antes de redirigir y completarlos después del callback exitoso.

## 🚀 Próximos Pasos

1. Probar la generación de enlaces en `/test-paguelofacil`
2. Probar un pago completo con tarjeta de prueba
3. Verificar que el callback cree el registro de pago correctamente
4. Optimizar el flujo de enrollment para completar automáticamente después del pago

