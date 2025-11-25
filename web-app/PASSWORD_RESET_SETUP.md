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

### 1. Configurar URL de Redirect

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a: **Authentication** → **URL Configuration**
3. En **Redirect URLs**, agrega:
   - **Desarrollo**: `http://localhost:3000/auth/reset-password`
   - **Producción**: `https://tu-dominio.vercel.app/auth/reset-password`
   - **Preview (Vercel)**: `https://tu-proyecto-*.vercel.app/auth/reset-password`

### 2. Configurar Email Templates (Opcional)

Supabase tiene templates de email por defecto, pero puedes personalizarlos:

1. Ve a: **Authentication** → **Email Templates**
2. Selecciona **Reset Password**
3. Personaliza el template si lo deseas
4. El enlace de reset se inyecta automáticamente como: `{{ .ConfirmationURL }}`

### 3. Configurar Variables de Entorno

Asegúrate de tener configurada la URL del sitio en producción:

```env
# En Vercel, agrega esta variable de entorno:
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
```

Si no está configurada, el sistema intentará detectarla automáticamente desde `VERCEL_URL`.

## 📧 Flujo de Usuario

1. Usuario hace click en "¿Olvidaste tu contraseña?" en `/login`
2. Usuario ingresa su email en `/auth/forgot-password`
3. Supabase envía un correo con enlace de recuperación
4. Usuario hace click en el enlace del correo
5. Es redirigido a `/auth/reset-password`
6. Usuario ingresa su nueva contraseña
7. Contraseña se actualiza y es redirigido a `/login?passwordReset=success`
8. Puede iniciar sesión con su nueva contraseña

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

