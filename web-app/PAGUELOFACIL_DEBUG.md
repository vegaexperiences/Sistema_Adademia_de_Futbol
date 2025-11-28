# 🔍 Debug: Error "INVALID DATA PETITION" - Paguelo Fácil SDK

## Información de la Documentación

Basado en la documentación oficial de Paguelo Fácil ([developers.paguelofacil.com](https://developers.paguelofacil.com/guias)), el error "INVALID DATA PETITION" generalmente indica:

1. **Credenciales incorrectas para el ambiente**
2. **Credenciales de un ambiente diferente** (sandbox vs producción)
3. **Formato incorrecto de las credenciales**

## ✅ Pasos de Verificación (Basados en Documentación Oficial)

### 1. Verificar Credenciales de Sandbox

Según la documentación, las credenciales de **sandbox** y **producción** son **diferentes** y **NO deben intercambiarse**.

**Acción:**
- Ve a: `https://demo.paguelofacil.com/mycompany/keys`
- Confirma que tanto el **Access Token API** como el **CCLW** sean del panel de **DEMO/SANDBOX**
- NO uses credenciales de producción en sandbox

### 2. Configuración del SDK

El SDK debe configurarse con `useAsSandbox(true)` **ANTES** de llamar a `openService`:

```javascript
// ✅ CORRECTO
pfWallet.useAsSandbox(true);  // Primero configurar el ambiente
pfWallet.openService({
    apiKey: "tu_access_token",
    cclw: "tu_cclw"
});

// ❌ INCORRECTO
pfWallet.openService({...});  // Sin configurar el ambiente primero
```

### 3. Script Correcto para Sandbox

Para el ambiente de sandbox, el script debe cargarse desde:
```html
<script src="https://sandbox.paguelofacil.com/HostedFields/vendor/scripts/WALLET/PFScript.js"></script>
```

### 4. Códigos de Error de la API

Según el [diccionario de datos de Paguelo Fácil](https://developers.paguelofacil.com/api/diccionario-de-datos):

| Code | Descripción |
|------|-------------|
| 410  | Invalid Api Key |
| 430  | Invalid KWP |

El error "INVALID DATA PETITION" no aparece en los códigos oficiales, lo que sugiere que es un error interno del SDK cuando las credenciales no coinciden con el ambiente.

## 🔧 Solución Recomendada

### Paso 1: Regenerar Access Token API en Sandbox

1. Ve a: `https://demo.paguelofacil.com/mycompany/keys`
2. Busca la sección "Access token API"
3. Si hay opción de "Regenerar", hazlo
4. Copia el **nuevo token completo** (incluye la parte después del `|`)
5. Actualiza tu `.env.local`:

```bash
PAGUELOFACIL_ACCESS_TOKEN=nuevo_token_aqui|segunda_parte_aqui
PAGUELOFACIL_CCLW=B5862B422898151E840F7710917B896B3A43A7A86524160FEE1DB0C50144A687B4BB96098609209CD45CF2B57941B9BA1A54395DE4B06CE08FED773CA161C993
PAGUELOFACIL_SANDBOX=true
```

### Paso 2: Verificar que el SDK esté Configurado Correctamente

El código actual ya configura el sandbox antes de llamar a `openService`, pero verifica que:
- `useAsSandbox(true)` se llama ANTES de `openService`
- Hay un delay después de configurar el sandbox
- El script se carga desde la URL de sandbox

### Paso 3: Contactar Soporte de Paguelo Fácil

Si después de regenerar las credenciales el error persiste:
1. Contacta al soporte técnico de Paguelo Fácil
2. Menciona:
   - Estás usando el SDK de JavaScript (pfWallet)
   - Error: "INVALID DATA PETITION" al llamar a `loadMerchantServices`
   - Estás en ambiente sandbox/demo
   - Has verificado que las credenciales son de sandbox

## 📋 Checklist Final

- [ ] Access Token API es de sandbox/demo (NO de producción)
- [ ] CCLW es de sandbox/demo
- [ ] `PAGUELOFACIL_SANDBOX=true` en `.env.local`
- [ ] El SDK carga el script desde `sandbox.paguelofacil.com`
- [ ] `useAsSandbox(true)` se llama ANTES de `openService`
- [ ] Servidor reiniciado después de actualizar `.env.local`
- [ ] No hay espacios extra en las credenciales
- [ ] El Access Token incluye ambas partes (separadas por `|`)

## 🔗 Referencias

- [Documentación Paguelo Fácil](https://developers.paguelofacil.com/guias)
- [Diccionario de Datos API](https://developers.paguelofacil.com/api/diccionario-de-datos)
- [Guía de Claves](https://developers.paguelofacil.com/guias/clave)

