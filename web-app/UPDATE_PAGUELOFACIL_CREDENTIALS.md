# 🔄 Actualizar Credenciales de Paguelo Fácil

## ✅ Credenciales Actualizadas Localmente

Las credenciales han sido actualizadas en el archivo `.env.local`:

- **PAGUELOFACIL_ACCESS_TOKEN**: `brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRehyFxpNPHswNnHdmv6umjY`
- **PAGUELOFACIL_CCLW**: `89822261C0492FDD6002241759749115F007DED59668AD80232983B02DCE0C7041C2C0533E64A9C964B0486E72DA91B9D4B223DDC562A2D4B142B5C8B252764E`
- **PAGUELOFACIL_SANDBOX**: `true` (modo sandbox activado)

## 📝 Actualizar en Vercel

Para que los cambios surtan efecto en producción, debes actualizar las variables de entorno en Vercel:

### Pasos:

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Actualiza las siguientes variables para **Production**, **Preview** y **Development**:

   #### **PAGUELOFACIL_ACCESS_TOKEN**
   - **Valor**: `brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRehyFxpNPHswNnHdmv6umjY`
   - ⚠️ **Importante**: Copia el token completo incluyendo la parte después del `|`
   - ⚠️ **No agregues espacios** antes o después del valor

   #### **PAGUELOFACIL_CCLW**
   - **Valor**: `89822261C0492FDD6002241759749115F007DED59668AD80232983B02DCE0C7041C2C0533E64A9C964B0486E72DA91B9D4B223DDC562A2D4B142B5C8B252764E`
   - ⚠️ **Importante**: No incluyas `PAGUELOFACIL_CCLW=` en el valor, solo el código
   - ⚠️ **No agregues espacios** antes o después del valor

   #### **PAGUELOFACIL_SANDBOX**
   - **Valor**: `true`
   - ⚠️ **Debe ser exactamente** `true` (no `True`, no `TRUE`, no `1`)

5. **Guarda** los cambios
6. **Haz un nuevo deploy** o espera a que Vercel detecte los cambios automáticamente

## ✅ Verificación

Después de actualizar en Vercel:

1. Espera a que el deploy se complete
2. Verifica en los logs de Vercel que aparezca:
   - `[PagueloFacil] Sandbox mode: true`
   - `[PagueloFacil] Configuration loaded`

3. Prueba un pago de prueba con Paguelo Fácil

## 🔍 Notas Importantes

- Las credenciales están configuradas para **modo SANDBOX** (`PAGUELOFACIL_SANDBOX=true`)
- Si necesitas cambiar a producción, actualiza `PAGUELOFACIL_SANDBOX=false` en Vercel
- No uses tarjetas reales en modo sandbox
- Verifica que las credenciales sean correctas antes de procesar pagos reales

## 🚀 Después de Actualizar

Una vez que hayas actualizado las variables en Vercel:

1. Vercel hará un nuevo deploy automáticamente
2. Los cambios estarán disponibles en producción en unos minutos
3. Puedes verificar el estado del deploy en el dashboard de Vercel

