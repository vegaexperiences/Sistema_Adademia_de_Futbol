# 🆔 Instrucciones: Cédula del Tutor Faltante

## ⚠️ **Problema Detectado**

El sistema ha detectado que el campo **"Número de identificación de Padre o Tutor"** (Columna AE) está **vacío** en todos los registros del formulario.

### **¿Por qué es importante?**

La cédula del tutor es necesaria para:
- ✅ Identificar correctamente a las familias
- ✅ Agrupar jugadores del mismo tutor
- ✅ Búsquedas rápidas por cédula
- ✅ Reportes y documentación oficial
- ✅ Cumplimiento legal y administrativo

---

## 🔧 **Solución: Hacer el Campo Obligatorio**

### **Paso 1: Abrir el Formulario de Google**

1. Ve a [Google Forms](https://forms.google.com)
2. Abre tu formulario de matrícula ("FORM_MATRICULA")
3. Busca la pregunta: **"Número de identificación de Padre o Tutor"**

### **Paso 2: Activar Campo Obligatorio**

1. Haz clic en la pregunta para editarla
2. En la esquina **inferior derecha** de la pregunta, verás un toggle que dice **"Obligatorio"**
3. **Activa** el toggle (debe ponerse morado/azul)
4. Verás un asterisco rojo (*) junto al título de la pregunta

### **Paso 3: Guardar Cambios**

1. Los cambios se guardan automáticamente
2. Cierra el editor del formulario

### **Paso 4: Informar a los Usuarios**

A partir de ahora, **todos los nuevos formularios** requerirán la cédula del tutor. Para los registros antiguos:

**Opción A: Solicitar la información**
- Contacta a los tutores que ya llenaron el formulario
- Pídeles que proporcionen su número de cédula
- Agrégalo manualmente en la hoja `FORM_MATRICULA` (columna AE)

**Opción B: Usar otro identificador**
- Si tienes otro campo con la cédula (ej. en columna diferente)
- Avísame y ajusto el código para leerlo desde ahí

---

## 📋 **Verificación**

### **Probar el Formulario:**

1. Abre el formulario en modo **"Vista previa"** (ícono del ojo)
2. Intenta enviar el formulario **sin llenar** la cédula del tutor
3. Deberías ver un mensaje de error: **"Esta pregunta es obligatoria"**
4. Llena la cédula y envía el formulario
5. Verifica que el dato aparezca en la columna AE de `FORM_MATRICULA`

### **Reprocesar Datos:**

Una vez que los nuevos formularios tengan la cédula:

1. Ve a `⚙️ Configuraciones`
2. Haz clic en **"📎 Reprocesar Datos con Archivos Corregidos"**
3. Los nuevos registros mostrarán la cédula correctamente

---

## 🎯 **Resultado Esperado**

### **Antes (Actual):**
```
javier vallejo
🆔 Cédula: ⚠️ No proporcionada en el formulario
📞 67667676
📧 javidavo05@gmail.com
```

### **Después (Con cédula):**
```
javier vallejo
�ID Cédula: 8-123-4567
📞 67667676
📧 javidavo05@gmail.com
```

---

## 💡 **Alternativas**

Si **NO puedes** hacer el campo obligatorio por alguna razón:

### **Opción 1: Agregar Manualmente**
1. Abre la hoja `FORM_MATRICULA`
2. Localiza la columna **AE** ("Número de identificación de Padre o Tutor")
3. Llena las cédulas manualmente para cada fila
4. Reprocesa los datos

### **Opción 2: Usar Otro Campo**
Si ya tienes la cédula en otra columna:
1. Dime en qué columna está (A, B, C, etc.)
2. Ajustaré el código para leerla desde ahí

### **Opción 3: Hacer Opcional**
Si la cédula no es crítica para tu operación:
- El sistema ya muestra un mensaje claro cuando falta
- La búsqueda funcionará con otros campos (nombre, teléfono, email)
- Los reportes indicarán "No proporcionada"

---

## 📞 **¿Necesitas Ayuda?**

Si tienes problemas para:
- Encontrar el formulario
- Activar el campo obligatorio
- Agregar las cédulas manualmente
- Cualquier otra duda

¡Avísame y te ayudo paso a paso! 🚀

