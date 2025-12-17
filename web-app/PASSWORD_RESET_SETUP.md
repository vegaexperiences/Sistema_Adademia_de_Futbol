# 🔐 Configuración de Restauración de Contraseña

## ✅ Funcionalidad Implementada

El sistema de restauración de contraseña está completamente implementado con Supabase Auth.

### Características:

1. **Solicitar Restauración de Contraseña**
   - Página: `/auth/forgot-password`
   - El usuario ingresa su email
   - Se envía un correo con enlace de recuperación

2. **Restablecer Contraseña**
   - Página: `/auth/reset-password`
   - El usuario hace click en el enlace del correo
   - Ingresa su nueva contraseña
   - La contraseña se actualiza automáticamente

3. **Botón en Login**
   - Link "¿Olvidaste tu contraseña?" en el formulario de login

## 🔧 Configuración en Supabase

### 1. Configurar URL de Redirect (Multi-Academia)

⚠️ **IMPORTANTE**: Este sistema soporta múltiples academias con dominios personalizados. Debes configurar los redirects para permitir todas las academias.

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a: **Authentication** → **URL Configuration**
3. En **Redirect URLs**, agrega las siguientes URLs:

   **Para Desarrollo Local**:
   - `http://localhost:3000/auth/callback`

   **Para Producción (Dominios Personalizados de Academias)**:
   - `https://academy.pimepanama.com/auth/callback` (Suarez Academy)
   - Agrega cada dominio de academia adicional: `https://otra-academy.com/auth/callback`
   
   **Para Preview Deployments de Vercel**:
   - `https://*-vegaexperiences.vercel.app/auth/callback` (wildcard para preview branches)
   - `https://sistema-adademia-de-futbol-*.vercel.app/auth/callback`

   **Nota sobre Wildcards**: 
   - Supabase soporta wildcards limitados (un nivel: `*.ejemplo.com`)
   - Para múltiples dominios raíz, debes agregar cada uno manualmente
   - Si usas subdominios consistentes (ej: `*.pimepanama.com`), puedes usar wildcard

### Flujo del Callback

El nuevo flujo utiliza `/auth/callback` en lugar de apuntar directamente a `/auth/reset-password`. Esto permite:
- Intercambiar el código de autorización por una sesión válida
- Manejar errores de forma apropiada
- Soportar múltiples tipos de autenticación (password reset, email verification, OAuth)
- Funcionar automáticamente para cualquier dominio de academia

### 2. Configurar Email Templates (Opcional)

Supabase tiene templates de email por defecto, pero puedes personalizarlos:

1. Ve a: **Authentication** → **Email Templates**
2. Selecciona **Reset Password**
3. Personaliza el template si lo deseas
4. El enlace de reset se inyecta automáticamente como: `{{ .ConfirmationURL }}`

### 3. Variables de Entorno (Opcional)

El sistema ahora detecta automáticamente el dominio correcto para cada academia usando `window.location.origin` del navegador. **No necesitas configurar NEXT_PUBLIC_SITE_URL** para el funcionamiento básico.

Sin embargo, puedes configurar estas variables como fallback:

```env
# Opcional - Solo como fallback si la detección automática falla
NEXT_PUBLIC_SITE_URL=https://academy.pimepanama.com
```

**¿Cuándo configurar NEXT_PUBLIC_SITE_URL?**
- Como fallback de seguridad
- Para testing desde servidor (sin navegador)
- Para dominios preview de Vercel

**Para múltiples academias**: No uses NEXT_PUBLIC_SITE_URL ya que solo puede tener un valor. El sistema detecta automáticamente el dominio correcto por academia.

## 📧 Flujo de Usuario (Multi-Academia)

**Ejemplo con academy.pimepanama.com (Suarez Academy)**:

1. Usuario hace click en "¿Olvidaste tu contraseña?" en `https://academy.pimepanama.com/login`
2. Usuario ingresa su email en `/auth/forgot-password`
3. El sistema detecta automáticamente el dominio: `academy.pimepanama.com`
4. Supabase envía un correo con enlace de recuperación apuntando a:
   ```
   https://djfwxmvlmvtvlydkimyt.supabase.co/auth/v1/verify?token=...&redirect_to=https://academy.pimepanama.com/auth/callback
   ```
5. Usuario hace click en el enlace del correo
6. Supabase redirige a `https://academy.pimepanama.com/auth/callback`
7. El callback handler intercambia el código por una sesión válida
8. Es redirigido a `/auth/reset-password` con sesión activa
9. Usuario ingresa su nueva contraseña
10. Contraseña se actualiza y es redirigido a `/login?passwordReset=success`
11. Puede iniciar sesión con su nueva contraseña

**El mismo flujo funciona para cualquier academia**:
- `https://otra-academy.com/...` → Links apuntarán a `otra-academy.com`
- `http://localhost:3000/...` → Links apuntarán a `localhost:3000`
- Sin configuración adicional por academia

## 🔒 Seguridad

- Los enlaces de recuperación tienen un tiempo de expiración (configurable en Supabase)
- Solo se puede restablecer la contraseña con un enlace válido
- Se valida que las contraseñas coincidan antes de actualizar
- Se requiere mínimo 6 caracteres para la nueva contraseña

## 🧪 Pruebas

### Prueba Local:

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Ve a `http://localhost:3000/login`
3. Click en "¿Olvidaste tu contraseña?"
4. Ingresa un email válido de tu base de datos
5. Revisa el correo (o Supabase logs si usas email de prueba)
6. Haz click en el enlace
7. Ingresa nueva contraseña

### Prueba en Producción:

1. Asegúrate de que `NEXT_PUBLIC_SITE_URL` esté configurada en Vercel
2. Verifica que las Redirect URLs estén configuradas en Supabase
3. Prueba el flujo completo desde producción

## 📝 Notas Importantes

- Los enlaces de recuperación expiran después de cierto tiempo (por defecto 1 hora en Supabase)
- Si el enlace expira, el usuario debe solicitar uno nuevo
- El sistema valida automáticamente si el enlace es válido antes de mostrar el formulario
- Si el enlace no es válido, se muestra un mensaje de error y opción para solicitar uno nuevo

## 🆘 Troubleshooting

### El correo no llega

1. Verifica que el email esté en tu base de datos de usuarios
2. Revisa la configuración de SMTP en Supabase (si usas SMTP personalizado)
3. Revisa los logs de Supabase para ver si hay errores

### El enlace no funciona

1. Verifica que la Redirect URL esté configurada correctamente en Supabase
2. Asegúrate de que `NEXT_PUBLIC_SITE_URL` esté configurada en producción
3. Verifica que el enlace no haya expirado

### Error al actualizar contraseña

1. Verifica que el enlace no haya expirado
2. Asegúrate de que las contraseñas coincidan
3. Verifica que la contraseña tenga al menos 6 caracteres

---

**¿Necesitas ayuda?** Revisa la documentación de Supabase Auth o los logs de tu aplicación.

