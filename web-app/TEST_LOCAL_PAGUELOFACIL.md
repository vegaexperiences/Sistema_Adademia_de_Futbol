# 🧪 Probar PagueloFacil Localmente

## ✅ Estado Actual

- ✅ Servidor corriendo en `http://localhost:3000`
- ✅ Variables de entorno configuradas
- ✅ Fixes aplicados (sin `created_by` ni `month_year`)

## 🧪 Cómo Probar Localmente

### 1. Acceder a la Aplicación

1. Abre tu navegador en: **http://localhost:3000**
2. Inicia sesión con tus credenciales

### 2. Probar el Flujo de Pago

1. Ve al dashboard de jugadores
2. Selecciona un jugador
3. Haz clic en "Agregar Pago" o "Pagar"
4. Selecciona **"Paguelo Fácil"** como método de pago
5. Ingresa un monto (ej: 100)
6. Haz clic en **"Pagar con Paguelo Fácil"**

### 3. Lo que Puedes Verificar

✅ **Creación del enlace de pago:**
- Abre la consola del navegador (F12)
- Deberías ver logs como:
  ```
  [PagueloFacil] Sandbox mode: true
  [PagueloFacil] Configuration loaded
  [PagueloFacil] Creating payment link...
  ```

✅ **Redirección a PagueloFacil:**
- Deberías ser redirigido a `https://checkout-demo.paguelofacil.com`
- El enlace debería tener un código como `LK-XXXXX`

✅ **Sin errores de esquema:**
- No deberías ver errores sobre `created_by` o `month_year`
- Los logs del servidor no deberían mostrar errores de base de datos

### 4. ⚠️ Limitación: Callback

El callback de PagueloFacil **NO funcionará** con `localhost` porque necesita una URL pública accesible desde internet.

**Para probar el callback completo, necesitas:**

1. **Instalar y configurar ngrok:**
   ```bash
   # Instalar ngrok (ya está instalado)
   # Autenticarse (necesitas cuenta gratuita en ngrok.com)
   ngrok config add-authtoken TU_TOKEN
   
   # Iniciar ngrok
   ngrok http 3000
   ```

2. **Actualizar `.env.local`:**
   ```bash
   NEXT_PUBLIC_APP_URL=https://TU_URL_NGROK.ngrok.io
   ```

3. **Reiniciar el servidor:**
   ```bash
   npm run dev
   ```

## 🔍 Verificar los Fixes

### En la Consola del Navegador:

Busca estos logs para confirmar que todo está bien:

```javascript
[PagueloFacil] Sandbox mode: true
[PagueloFacil] Configuration loaded
[PagueloFacil] Creating payment link in SANDBOX mode
[PagueloFacil] ✅ Payment link created successfully
```

### En los Logs del Servidor:

No deberías ver:
- ❌ `Could not find the 'created_by' column`
- ❌ `Could not find the 'month_year' column`

## 📝 Notas

- El pago se procesará en el sandbox de PagueloFacil
- Puedes usar tarjetas de prueba
- El callback solo funcionará si configuras ngrok
- Sin ngrok, puedes probar hasta la redirección a PagueloFacil

## 🚀 Alternativa: Probar en Vercel

Si prefieres probar el flujo completo (incluyendo callbacks), puedes:

1. Esperar a que Vercel despliegue los últimos commits
2. Probar directamente en: `https://sistema-adademia-de-futbol-tura.vercel.app`
3. El callback funcionará correctamente porque Vercel tiene una URL pública

