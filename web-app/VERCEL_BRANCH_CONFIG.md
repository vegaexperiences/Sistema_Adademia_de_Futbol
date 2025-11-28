# Configuración de Ramas en Vercel

## Problema
Tanto `main` como `dev` se están desplegando automáticamente en Vercel.

## Solución Recomendada

### Opción 1: Solo Producción (main)
1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **Git**
4. En **Production Branch**, asegúrate de que esté configurado como `main`
5. Ve a **Deployments**
6. Para cada deployment de `dev`, haz clic en los tres puntos (...) y selecciona **Ignore Build Step**
7. O mejor aún, en **Settings** → **Git** → **Ignored Build Step**, agrega:
   ```
   git diff HEAD^ HEAD --quiet ./
   ```
   Esto solo construirá si hay cambios en archivos (no solo commits)

### Opción 2: Mantener ambos (Recomendado para desarrollo)
- **main** → Producción (https://sistema-adademia-de-futbol-tura.vercel.app)
- **dev** → Preview (URL única por cada commit)

Esto es útil para:
- Probar cambios antes de mergear a main
- Tener un ambiente de staging
- No afectar producción mientras desarrollas

### Opción 3: Desactivar deployment automático de dev
1. Ve a **Settings** → **Git**
2. Desactiva **Automatic deployments from Git**
3. O configura **Ignored Build Step** para `dev`:
   ```
   [ "$VERCEL_GIT_COMMIT_REF" = "dev" ]
   ```

## Configuración Actual
- **Producción**: `main` branch
- **Preview**: `dev` branch (si está activo)

## Recomendación
Mantener ambos deployments es útil para desarrollo. Si solo quieres producción, desactiva `dev` en Vercel.

