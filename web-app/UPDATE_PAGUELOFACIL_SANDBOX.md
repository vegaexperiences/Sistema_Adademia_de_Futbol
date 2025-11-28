# 🔧 Actualizar Configuración de Paguelo Fácil - Sandbox

## ⚠️ Importante

Estás usando el ambiente **SANDBOX/DEMO** de Paguelo Fácil, así que necesitas configurar:

1. **`PAGUELOFACIL_SANDBOX=true`** ✅ (Debe estar en `true` para sandbox)
2. **`PAGUELOFACIL_CCLW`** con el nuevo código que acabas de generar
3. **`PAGUELOFACIL_ACCESS_TOKEN`** con el token de sandbox/demo

## 📝 Configuración para `.env.local`

Abre tu archivo `.env.local` y asegúrate de que tenga estas líneas **exactamente así**:

```bash
# Paguelo Fácil Configuration - SANDBOX/DEMO
PAGUELOFACIL_ACCESS_TOKEN=brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRtCYPjVUZmYa6DGdGWCgkKp
PAGUELOFACIL_CCLW=B5862B422898151E840F7710917B896B3A43A7A86524160FEE1DB0C50144A687B4BB96098609209CD45CF2B57941B9BA1A54395DE4B06CE08FED773CA161C993
PAGUELOFACIL_SANDBOX=true
```

## ✅ Verificaciones

1. **`PAGUELOFACIL_SANDBOX=true`** (NO `false`, NO vacío, NO comentado)
2. El CCLW debe ser el nuevo que acabas de generar
3. No debe haber espacios extra alrededor del `=`
4. No debe haber comillas alrededor de los valores

## 🔄 Después de actualizar

1. **Guarda** el archivo `.env.local`
2. **Reinicia** el servidor de desarrollo (`npm run dev`)
3. **Prueba** de nuevo el pago con Paguelo Fácil

## 🐛 Si sigue fallando

Verifica en la consola del navegador que aparezca:
- `[PagueloFacil] Sandbox mode: true`
- `[PagueloFacil] Current isSandbox before openService: true`

Si aparece `false`, el problema es que `PAGUELOFACIL_SANDBOX` no está configurado correctamente.

