# 🔄 Cambiar a Credenciales de Sandbox

## Credenciales de Sandbox

Usa estas credenciales para hacer pruebas en el ambiente de sandbox:

```bash
# Paguelo Fácil Configuration - SANDBOX/DEMO
PAGUELOFACIL_ACCESS_TOKEN=brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRtCYPjVUZmYa6DGdGWCgkKp
PAGUELOFACIL_CCLW=B5862B422898151E840F7710917B896B3A43A7A86524160FEE1DB0C50144A687B4BB96098609209CD45CF2B57941B9BA1A54395DE4B06CE08FED773CA161C993
PAGUELOFACIL_SANDBOX=true
```

## Pasos para Cambiar

### 1. Actualizar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Actualiza o agrega estas variables:

   - **`PAGUELOFACIL_ACCESS_TOKEN`**: `brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRtCYPjVUZmYa6DGdGWCgkKp`
   - **`PAGUELOFACIL_CCLW`**: `B5862B422898151E840F7710917B896B3A43A7A86524160FEE1DB0C50144A687B4BB96098609209CD45CF2B57941B9BA1A54395DE4B06CE08FED773CA161C993`
   - **`PAGUELOFACIL_SANDBOX`**: `true`

5. Asegúrate de que estén configuradas para **Production**, **Preview**, y **Development**
6. Haz clic en **Save**

### 2. Actualizar Variables de Entorno Localmente

Si estás desarrollando localmente, actualiza tu archivo `.env.local`:

```bash
# Paguelo Fácil Configuration - SANDBOX/DEMO
PAGUELOFACIL_ACCESS_TOKEN=brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRtCYPjVUZmYa6DGdGWCgkKp
PAGUELOFACIL_CCLW=B5862B422898151E840F7710917B896B3A43A7A86524160FEE1DB0C50144A687B4BB96098609209CD45CF2B57941B9BA1A54395DE4B06CE08FED773CA161C993
PAGUELOFACIL_SANDBOX=true
```

### 3. Reiniciar el Servidor

Después de actualizar las variables de entorno:

1. **En Vercel**: Los cambios se aplicarán automáticamente en el próximo deployment
2. **Localmente**: Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Verificación

Después de cambiar las credenciales, verifica en los logs:

1. Los logs deberían mostrar: `[PagueloFacil] Sandbox mode: true`
2. El endpoint usado será: `https://sandbox.paguelofacil.com/LinkDeamon.cfm`
3. Los pagos de prueba funcionarán en el ambiente de sandbox

## Panel de Sandbox

- **URL del Panel**: https://demo.paguelofacil.com/mycompany/keys
- **URL de LinkDeamon**: https://sandbox.paguelofacil.com/LinkDeamon.cfm

## Notas Importantes

- ✅ Las credenciales de sandbox son diferentes a las de producción
- ✅ Los pagos en sandbox son de prueba y no se procesan realmente
- ✅ Puedes hacer múltiples pruebas sin costo
- ⚠️ Asegúrate de cambiar de vuelta a producción antes de ir a producción real

