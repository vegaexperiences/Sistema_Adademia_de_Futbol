# 🔧 Solución: Error "Invalid token" en Paguelo Fácil

## Problema

Estás viendo el error:
```
Error en Paguelo Fácil: Invalid token: brEyQRSzMm2UwQа5v0NsobRa3U8nH5xT
```

El problema es que el token contiene caracteres no válidos (probablemente una "а" cirílica en lugar de una "a" latina) que fueron copiados incorrectamente.

## ✅ Solución

### Opción 1: Verificar y Corregir las Variables de Entorno

1. **Verifica tu archivo `.env.local`** o las variables en Vercel:

```bash
PAGUELOFACIL_ACCESS_TOKEN=brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRtCYPjVUZmYa6DGdGWCgkKp
PAGUELOFACIL_CCLW=C7881194DD86A8C5DA79C3BED569A63996C510BCC4A545892457B0BF7097F356498010C6071E3F4DFD6490735BBF7F6966
PAGUELOFACIL_SANDBOX=false
```

2. **Asegúrate de que:**
   - No hay espacios extra al inicio o final
   - No hay caracteres especiales invisibles
   - El token está completo (incluye la parte después del `|`)

3. **Copia el token directamente desde tu cuenta de Paguelo Fácil** (no desde un documento que pueda tener caracteres incorrectos)

### Opción 2: El Código Ahora Limpia Automáticamente

He actualizado el código para que automáticamente:
- Elimine caracteres no-ASCII del token
- Valide que el token no esté vacío después de limpiarlo
- Muestre una advertencia si se detectaron caracteres problemáticos

**Si el error persiste después de esto, el problema es que el token en sí es inválido o está incompleto.**

### Opción 3: Verificar el Token en Paguelo Fácil

1. Ve a tu panel de Paguelo Fácil
2. Verifica que el **Access Token API** sea exactamente:
   ```
   brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRtCYPjVUZmYa6DGdGWCgkKp
   ```
3. Copia el token directamente desde el panel (no desde un documento intermedio)
4. Pégalo directamente en tu `.env.local` o en Vercel

### Para Vercel:

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Busca `PAGUELOFACIL_ACCESS_TOKEN`
4. **Edita** y pega el token directamente desde Paguelo Fácil
5. Asegúrate de que no haya espacios extra
6. **Save** y haz un nuevo deploy

## 🔍 Verificación

Después de corregir el token:

1. Reinicia tu servidor de desarrollo (`npm run dev`)
2. Intenta hacer un pago con Paguelo Fácil
3. El error debería desaparecer

## 📝 Nota

El código ahora limpia automáticamente caracteres problemáticos, pero es mejor asegurarse de que el token esté correcto desde el principio para evitar problemas.

