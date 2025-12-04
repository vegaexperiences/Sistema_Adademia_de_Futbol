# 🔧 Configuración Automática de URL Base

## ✅ Problema Resuelto

Ya no necesitas cambiar `NEXT_PUBLIC_APP_URL` cada vez que cambias entre desarrollo local y producción. El sistema ahora detecta automáticamente el entorno.

## 🎯 Cómo Funciona

### 1. **Detección Automática**

El sistema detecta automáticamente la URL base según el entorno:

- **Local (sin ngrok)**: `http://localhost:3000`
- **Local con ngrok**: Usa la URL de ngrok si `NEXT_PUBLIC_APP_URL` está configurado
- **Producción (Vercel)**: Detecta automáticamente desde los headers de Vercel
- **Explícito**: Si defines `NEXT_PUBLIC_APP_URL`, siempre se usa esa

### 2. **Prioridad de Detección**

1. **`NEXT_PUBLIC_APP_URL`** (si está configurado) - **Máxima prioridad**
2. Headers de Vercel (`x-forwarded-host`, `x-forwarded-proto`)
3. Header `host` de la petición
4. Header `origin` de la petición
5. URL de la petición actual
6. Fallback automático según entorno

## 📝 Configuración

### Opción 1: Sin Configuración (Recomendado)

**No configures nada** - El sistema detectará automáticamente:

- **Local**: `http://localhost:3000`
- **Producción**: URL de Vercel automáticamente

### Opción 2: Con ngrok para Callbacks Locales

Si quieres probar callbacks localmente con ngrok:

1. **Inicia ngrok:**
   ```bash
   ngrok http 3000
   ```

2. **Copia la URL de ngrok** (ej: `https://abc123.ngrok.io`)

3. **Agrega a `.env.local`** (solo cuando uses ngrok):
   ```bash
   NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```

4. **Reinicia el servidor:**
   ```bash
   npm run dev
   ```

5. **Cuando termines de probar con ngrok**, simplemente **comenta o elimina** esa línea:
   ```bash
   # NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```

### Opción 3: Forzar una URL Específica

Si necesitas forzar una URL específica (raro), agrega a `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=https://tu-url-especifica.com
```

## 🎯 Casos de Uso

### Desarrollo Local Normal

```bash
# .env.local - No necesitas NEXT_PUBLIC_APP_URL
# El sistema usará automáticamente: http://localhost:3000
```

### Desarrollo Local con Callbacks (ngrok)

```bash
# .env.local
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io  # Solo cuando uses ngrok
```

### Producción (Vercel)

```bash
# No necesitas configurar nada en Vercel
# El sistema detecta automáticamente la URL de Vercel
```

## 🔍 Verificación

### En los Logs del Servidor

Busca estos logs para ver qué URL está usando:

```
[PagueloFacil Callback] Base URL determined: http://localhost:3000
```

O en producción:

```
[PagueloFacil Callback] Base URL determined: https://sistema-adademia-de-futbol-tura.vercel.app
```

### En la Consola del Navegador

Los callbacks y redirecciones usarán la URL correcta automáticamente.

## ✅ Ventajas

1. **No más cambios manuales** entre local y producción
2. **Funciona automáticamente** en Vercel
3. **Soporte para ngrok** cuando lo necesites
4. **Fallbacks inteligentes** si algo falla
5. **Un solo lugar** para la lógica de detección

## 📚 Archivos Modificados

- `src/lib/utils/get-base-url.ts` - Nueva función helper
- `src/app/api/payments/paguelofacil/callback/route.ts` - Usa la nueva función
- `src/app/api/payments/paguelofacil/link/route.ts` - Usa la nueva función

## 🚀 Próximos Pasos

Puedes actualizar otros archivos que usen `NEXT_PUBLIC_APP_URL` para usar la nueva función helper:

```typescript
import { getBaseUrl, getBaseUrlFromRequest } from '@/lib/utils/get-base-url';

// En componentes del cliente
const baseUrl = getBaseUrl();

// En API routes
const baseUrl = getBaseUrlFromRequest(request);
```

