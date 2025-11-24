# 🔐 Instrucciones de Autorización - SUAREZ ACADEMY

## ⚠️ Error: "Se necesita autorización para realizar esta acción"

Este error aparece cuando accedes al sistema desde:
- ✅ Una **nueva computadora**
- ✅ Un **nuevo navegador**
- ✅ Después de **limpiar cookies/caché**
- ✅ La **primera vez** que usas el sistema

## 🚀 Solución Rápida (3 Pasos)

### **Opción 1: Autorizar desde el Menú de Google Sheets**

1. **Abre el menú** `🏆 Academia Fútbol` en Google Sheets
2. **Haz clic en** `🔐 Solicitar Autorización`
3. **Acepta los permisos** cuando Google te lo solicite
4. **Recarga la página** y prueba de nuevo

### **Opción 2: Autorizar desde Configuraciones**

1. **Abre** `🏆 Academia Fútbol` → `⚙️ Configuraciones`
2. **Busca la sección** "🔧 Sistema y Menú"
3. **Haz clic en** `🔐 Solicitar Autorización`
4. **Acepta los permisos** cuando se te solicite
5. **Recarga la página** y prueba de nuevo

### **Opción 3: Forzar Autorización (si las anteriores fallan)**

1. **Ve a** `⚙️ Configuraciones`
2. **Haz clic en** `🔓 Forzar Autorización`
3. **Acepta TODOS los permisos** solicitados
4. **Recarga la página completamente** (Ctrl+R o Cmd+R)
5. **Prueba de nuevo**

## 📋 Permisos Necesarios

El sistema necesita los siguientes permisos:

### **Permisos Básicos:**
- ✅ **Ver y administrar hojas de cálculo** - Para gestionar datos de jugadores
- ✅ **Almacenamiento de propiedades** - Para guardar configuraciones
- ✅ **Interfaz de usuario** - Para mostrar dashboards y ventanas
- ✅ **Acceso a Drive (solo lectura)** - Para archivos adjuntos de formularios

### **¿Por qué se solicitan estos permisos?**
- 📊 **Hojas de cálculo**: Para leer/escribir datos de jugadores, pagos, etc.
- 💾 **Propiedades**: Para guardar configuraciones del sistema
- 🖥️ **Interfaz**: Para mostrar los dashboards HTML
- 📁 **Drive**: Para acceder a las cédulas/documentos subidos en formularios

## 🔍 Verificar Autorización

Para verificar si ya estás autorizado:

1. **Ve a** `⚙️ Configuraciones`
2. **Haz clic en** `🔍 Verificar Estado del Sistema`
3. **Revisa el mensaje** - te dirá si todo está OK

## ❓ Preguntas Frecuentes

### **P: ¿Por qué necesito autorizar desde cada computadora?**
**R:** Google Apps Script requiere autorización por sesión de navegador para proteger tu cuenta y datos.

### **P: ¿Los permisos son seguros?**
**R:** Sí, el script solo tiene acceso a esta hoja de cálculo específica, no a toda tu cuenta de Google.

### **P: ¿Qué pasa si rechazo los permisos?**
**R:** El sistema no funcionará. Necesitas aceptar los permisos para usar cualquier funcionalidad.

### **P: ¿Debo autorizar cada vez que abro la hoja?**
**R:** No, solo la primera vez desde cada computadora/navegador.

## 🆘 Si Nada Funciona

Si después de seguir todos los pasos aún no funciona:

1. **Cierra completamente** el navegador
2. **Vuelve a abrir** Google Sheets
3. **Ve a** `Extensiones` → `Apps Script`
4. **Ejecuta manualmente** la función `requestAuthorization`
5. **Acepta los permisos** en la ventana emergente
6. **Vuelve a Google Sheets** y prueba de nuevo

## 📞 Soporte

Si continúas teniendo problemas de autorización, contacta al administrador del sistema.

---

**Última actualización:** Octubre 2025  
**Sistema:** SUAREZ ACADEMY Management System v2.0

