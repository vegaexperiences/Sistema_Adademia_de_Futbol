# 📧 Información para Contactar Soporte de Paguelo Fácil

## ✅ Credenciales Verificadas

- **Access Token API (Sandbox)**: `brEyQRSzMm2UwQa5v0NsobRa3U8nH5xT|DIRtCYPjVUZmYa6DGdGWCgkKp`
- **CCLW (Sandbox)**: `B5862B422898151E840F7710917B896B3A43A7A86524160FEE1DB0C50144A687B4BB96098609209CD45CF2B57941B9BA1A54395DE4B06CE08FED773CA161C993`
- **Ambiente**: Sandbox/Demo ✅
- **Panel**: `https://demo.paguelofacil.com/mycompany/keys`

## ❌ Error Actual

**Error**: "INVALID DATA PETITION"  
**Método**: `loadMerchantServices` (interno del SDK)  
**Cuándo**: Al llamar a `pfWallet.openService({ apiKey, cclw })`  
**Ambiente**: Sandbox/Demo

## 🔍 Configuración Verificada

1. ✅ Credenciales son de sandbox/demo
2. ✅ `PAGUELOFACIL_SANDBOX=true` configurado
3. ✅ SDK cargado desde `sandbox.paguelofacil.com`
4. ✅ `useAsSandbox(true)` llamado antes de `openService`
5. ✅ Credenciales limpiadas (sin caracteres no-ASCII)

## 📋 Información para el Soporte

**SDK usado**: JavaScript Wallet SDK (`pfWallet`)  
**URL del script**: `https://sandbox.paguelofacil.com/HostedFields/vendor/scripts/WALLET/PFScript.js`  
**Método**: `pfWallet.openService({ apiKey, cclw })`  
**Error completo**: `{ message: 'method -> GET -> loadMerchantServices', error: 'INVALID DATA PETITION' }`

## 🔗 Referencias

- [Documentación Paguelo Fácil](https://developers.paguelofacil.com/guias)
- [Diccionario de Datos API](https://developers.paguelofacil.com/api/diccionario-de-datos)

## 💬 Mensaje Sugerido para Soporte

```
Hola,

Estoy integrando el SDK de JavaScript de Paguelo Fácil (pfWallet) en ambiente sandbox/demo 
y estoy recibiendo el siguiente error:

Error: "INVALID DATA PETITION"
Método: loadMerchantServices (interno del SDK)
Al llamar: pfWallet.openService({ apiKey, cclw })

Credenciales verificadas en:
- Panel: https://demo.paguelofacil.com/mycompany/keys
- Access Token API: [confirmado en panel]
- CCLW: [confirmado en panel]
- Ambiente: Sandbox/Demo

Configuración:
- SDK cargado desde: sandbox.paguelofacil.com
- useAsSandbox(true) llamado antes de openService
- Credenciales limpiadas y validadas

¿Podrían verificar si hay alguna configuración adicional necesaria en la cuenta 
de sandbox o si hay algún problema conocido con este error?

Gracias.
```

