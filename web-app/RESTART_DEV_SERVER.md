# Reiniciar Servidor de Desarrollo - Limpiar Cache

Los errores que ves son de código viejo en CACHE. El código está limpio, pero el servidor de desarrollo tiene el código viejo en memoria.

## Pasos para Reiniciar:

### 1. Parar el Servidor
En la terminal donde corre `npm run dev`, presiona:
```
Ctrl + C
```

### 2. Limpiar Cache de Next.js
```bash
rm -rf .next
```

### 3. Reiniciar el Servidor
```bash
npm run dev
```

### 4. Limpiar Cache del Navegador
Una vez que el servidor reinicie:
1. Abre la página en el navegador
2. Presiona **Cmd+Shift+R** (Mac) o **Ctrl+Shift+F5** (Windows/Linux)
3. Esto hace un "hard refresh" y limpia el cache del navegador

## Verificación

Después de estos pasos, los errores deberían desaparecer:
- ❌ "Could not find the table 'public.academies'" → Debería desaparecer
- ❌ "column sponsor_registrations.academy_id does not exist" → Debería desaparecer
- ❌ "Filtrar por Academia" → Ya no debería aparecer
- ❌ "selecciona una academia" → Ya no debería aparecer

El código está 100% limpio de referencias a academies y academy_id. Es solo un problema de cache.
