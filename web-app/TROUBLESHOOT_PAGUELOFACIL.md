# 🔍 Troubleshooting: Error "INVALID DATA PETITION" en Paguelo Fácil

## Problema Actual

El error "INVALID DATA PETITION" al llamar a `loadMerchantServices` indica que las credenciales no son válidas para el ambiente sandbox.

## ✅ Verificaciones Necesarias

### 1. Access Token API de Sandbox

El Access Token que estás usando debe ser **específico para sandbox/demo**. Es posible que tengas:
- Access Token de producción ❌
- Access Token de sandbox ✅

**Pasos:**
1. Ve a tu panel de Paguelo Fácil en **demo/sandbox** (`demo.paguelofacil.com`)
2. Ve a la sección "Llaves" (Keys)
3. Verifica que el **Access Token API** mostrado sea el de sandbox
4. Copia ese token completo (incluye la parte después del `|`)
5. Actualiza tu `.env.local`

### 2. CCLW de Sandbox

Ya actualizaste el CCLW, pero verifica que:
- El CCLW que copiaste es del panel de **demo/sandbox** (NO de producción)
- El CCLW está completo (128 caracteres)

### 3. Verificar que el Access Token sea de Sandbox

En el panel de Paguelo Fácil:
- Si estás en `demo.paguelofacil.com` → Las credenciales son de sandbox ✅
- Si estás en `paguelofacil.com` (sin demo) → Las credenciales son de producción ❌

## 🔧 Posibles Soluciones

### Opción 1: Regenerar Access Token API en Sandbox

1. Ve a `demo.paguelofacil.com/mycompany/keys`
2. En la sección "Access token API", haz clic en "Generar" o "Regenerar"
3. Copia el nuevo token completo
4. Actualiza `PAGUELOFACIL_ACCESS_TOKEN` en `.env.local`

### Opción 2: Verificar Formato del Access Token

El Access Token tiene este formato:
```
parte1|parte2
```

El SDK debería recibirlo **completo con el pipe**. Verifica que:
- No hay espacios extra
- El pipe `|` está presente
- Ambas partes están completas

### Opción 3: Contactar Soporte de Paguelo Fácil

Si las credenciales están correctas pero el error persiste:
1. Contacta al soporte técnico de Paguelo Fácil
2. Menciona que estás usando el SDK de JavaScript
3. Proporciona el error específico: "INVALID DATA PETITION" al llamar a `loadMerchantServices`
4. Confirma que las credenciales son de sandbox

## 📋 Checklist Final

Antes de probar de nuevo, verifica:

- [ ] Estás en el panel de **demo/sandbox** (`demo.paguelofacil.com`)
- [ ] El **Access Token API** es del panel de sandbox
- [ ] El **CCLW** es del panel de sandbox
- [ ] `PAGUELOFACIL_SANDBOX=true` en `.env.local`
- [ ] No hay espacios extra en las credenciales
- [ ] El Access Token incluye ambas partes separadas por `|`
- [ ] Reiniciaste el servidor después de actualizar `.env.local`

## 🔄 Próximos Pasos

1. **Regenera el Access Token API en sandbox** (si aún no lo has hecho)
2. **Copia directamente desde el panel** (no desde un documento intermedio)
3. **Actualiza `.env.local`** con el nuevo Access Token
4. **Reinicia el servidor**
5. **Prueba de nuevo**

Si el problema persiste, es posible que necesites credenciales diferentes o que haya un problema con la cuenta de sandbox.

