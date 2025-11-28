# 🔄 Actualizar Paguelo Fácil a Producción

## Variables de Entorno para Producción

Actualiza las siguientes variables de entorno en tu archivo `.env.local` y en Vercel:

### Para `.env.local`:

```bash
# Paguelo Fácil Configuration - PRODUCCIÓN
PAGUELOFACIL_ACCESS_TOKEN=SlLmEttBcJBgyYjIq4CasgIEsOtrFaZm|DIRjwpAseFjpEnbEfE1E3jNBK
PAGUELOFACIL_CCLW=B415AD8703F1E8A7C8D33C501D2C5CCCD59A6881E9ACBD5C26E42608A8C5F0B5B0990B325D2570D29AC598861A4BC2EDDE57FFF0808D1604FB1E8F034513F424
PAGUELOFACIL_SANDBOX=false
```

### Para Vercel:

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Actualiza las siguientes variables para **Production**, **Preview** y **Development**:

   - **`PAGUELOFACIL_ACCESS_TOKEN`**
     - Valor: `SlLmEttBcJBgyYjIq4CasgIEsOtrFaZm|DIRjwpAseFjpEnbEfE1E3jNBK`
     - ⚠️ Asegúrate de copiar el token completo incluyendo la parte después del `|`

   - **`PAGUELOFACIL_CCLW`**
     - Valor: `B415AD8703F1E8A7C8D33C501D2C5CCCD59A6881E9ACBD5C26E42608A8C5F0B5B0990B325D2570D29AC598861A4BC2EDDE57FFF0808D1604FB1E8F034513F424`
     - ⚠️ No incluyas `PAGUELOFACIL_CCLW=` en el valor, solo el código

   - **`PAGUELOFACIL_SANDBOX`**
     - Valor: `false`
     - ⚠️ Debe ser exactamente `false` (no `False`, no `FALSE`, no vacío)

## ✅ Verificaciones

Después de actualizar:

1. **Guarda** el archivo `.env.local`
2. **Reinicia** el servidor de desarrollo (`npm run dev`)
3. **Haz un nuevo deploy** en Vercel después de actualizar las variables
4. **Prueba** un pago de prueba con una tarjeta de prueba (si Paguelo Fácil las proporciona)

## 🔍 Verificar que está en Producción

En los logs de la consola deberías ver:
- `[PagueloFacil] Sandbox mode: false`
- Las URLs deberían apuntar a `secure.paguelofacil.com` (no `sandbox.paguelofacil.com`)

## ⚠️ Importante

- **No uses tarjetas reales** para pruebas en producción
- Verifica que las credenciales sean correctas antes de procesar pagos reales
- El CCLW y Access Token deben ser exactamente como se muestran arriba (sin espacios extra)


