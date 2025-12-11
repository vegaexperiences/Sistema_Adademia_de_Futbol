# 🔧 Configurar ngrok para Callbacks Locales

## ⚠️ Nota Importante

**"TU_TOKEN_AQUI" era solo un ejemplo**. Necesitas obtener tu token real de ngrok.

## 📝 Pasos para Configurar ngrok

### 1. Crear Cuenta en ngrok (Gratis)

1. Ve a: https://ngrok.com
2. Crea una cuenta gratuita (solo necesitas email)
3. Es completamente gratis para uso básico

### 2. Obtener tu Authtoken

1. Después de crear la cuenta, ve a: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copia tu authtoken (será algo como: `2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`)

### 3. Configurar ngrok

Ejecuta este comando reemplazando `TU_TOKEN_REAL` con el token que copiaste:

```bash
ngrok config add-authtoken TU_TOKEN_REAL
```

### 4. Iniciar ngrok

```bash
ngrok http 3000
```

### 5. Copiar la URL de ngrok

Verás algo como:

```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

Copia la URL `https://abc123.ngrok.io` (la tuya será diferente)

### 6. Configurar en `.env.local`

Agrega esta línea a tu `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=https://TU_URL_NGROK.ngrok.io
```

**Ejemplo:**
```bash
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

### 7. Reiniciar el Servidor

```bash
# Detén el servidor (Ctrl+C)
# Reinicia
npm run dev
```

## ✅ Verificación

1. Abre http://localhost:3000
2. Prueba crear un pago con PagueloFacil
3. El callback debería funcionar porque ngrok expone tu localhost a internet

## 🔄 Cuando Termines de Probar

Cuando termines de probar con ngrok:

1. **Detén ngrok** (Ctrl+C en la terminal de ngrok)
2. **Comenta o elimina** la línea de `.env.local`:
   ```bash
   # NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```
3. **Reinicia el servidor**

El sistema volverá a usar `http://localhost:3000` automáticamente.

## 🎯 Alternativa: Probar sin ngrok

**Puedes probar sin ngrok** - Solo que el callback no funcionará, pero puedes verificar:

- ✅ Creación del enlace de pago
- ✅ Redirección a PagueloFacil
- ✅ Que no hay errores de `created_by` o `month_year`
- ✅ La interfaz funciona correctamente

El callback solo se ejecutará cuando PagueloFacil redirija de vuelta, pero puedes probar todo lo demás.

## 💡 Recomendación

Para desarrollo normal, **no necesitas ngrok**. Solo úsalo cuando específicamente necesites probar el callback completo localmente.

En producción (Vercel), el callback funciona automáticamente sin configuración adicional.

