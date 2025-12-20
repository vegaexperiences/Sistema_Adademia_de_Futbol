# 🧪 Testing Guide: Password Reset Flow (Multi-Academia)

## Pre-requisitos

Antes de probar, asegúrate de:

1. ✅ Haber configurado las Redirect URLs en Supabase Dashboard (ver `PASSWORD_RESET_SETUP.md`)
2. ✅ Los cambios están desplegados en Vercel
3. ✅ Tienes acceso al email del usuario de prueba

## Checklist de Testing

### Test 1: Password Reset en Producción (academy.pimepanama.com)

- [ ] 1. Navegar a `https://academy.pimepanama.com/login`
- [ ] 2. Click en "¿Olvidaste tu contraseña?"
- [ ] 3. Verificar que la URL es `https://academy.pimepanama.com/auth/forgot-password`
- [ ] 4. Ingresar email: `vegaexperiences@gmail.com`
- [ ] 5. Click en "Enviar Enlace de Recuperación"
- [ ] 6. Verificar mensaje de éxito: "Se ha enviado un correo..."
- [ ] 7. Revisar el correo recibido
- [ ] 8. **CRÍTICO**: Verificar que el link en el email incluye:
  - `redirect_to=https://academy.pimepanama.com/auth/callback` (NO localhost)
- [ ] 9. Click en el enlace del email
- [ ] 10. Verificar que redirige a `https://academy.pimepanama.com/auth/callback`
- [ ] 11. Verificar que luego redirige automáticamente a `/auth/reset-password`
- [ ] 12. Verificar que muestra el formulario de nueva contraseña
- [ ] 13. Ingresar nueva contraseña (ej: `Test123456`)
- [ ] 14. Confirmar la contraseña
- [ ] 15. Click en "Actualizar Contraseña"
- [ ] 16. Verificar mensaje de éxito: "Contraseña Actualizada"
- [ ] 17. Click en "Ir al inicio de sesión"
- [ ] 18. Iniciar sesión con la nueva contraseña
- [ ] 19. ✅ Verificar acceso exitoso al dashboard

### Test 2: Password Reset en Localhost

- [ ] 1. Iniciar servidor local: `npm run dev`
- [ ] 2. Navegar a `http://localhost:3000/login`
- [ ] 3. Seguir pasos 2-19 del Test 1
- [ ] 4. Verificar que el link del email incluye:
  - `redirect_to=http://localhost:3000/auth/callback`

### Test 3: Verificar Multi-Academia (Si hay otra academia)

Si tienes otra academia configurada (ej: `otra-academy.com`):

- [ ] 1. Repetir Test 1 pero usando el dominio de la otra academia
- [ ] 2. Verificar que el link del email usa el dominio correcto de esa academia
- [ ] 3. Confirmar que el flujo completo funciona

### Test 4: Manejo de Errores

#### 4.1 Link Expirado
- [ ] 1. Solicitar password reset
- [ ] 2. Esperar 1+ hora (o el tiempo de expiración configurado)
- [ ] 3. Intentar usar el link
- [ ] 4. Verificar mensaje de error apropiado
- [ ] 5. Verificar link para solicitar nuevo reset

#### 4.2 Link Inválido
- [ ] 1. Modificar manualmente el token en un link de reset
- [ ] 2. Intentar acceder
- [ ] 3. Verificar mensaje de error apropiado

#### 4.3 Email No Existe
- [ ] 1. Intentar reset con email que no existe
- [ ] 2. Verificar que NO muestra error (por seguridad)
- [ ] 3. Verificar mensaje genérico de éxito

## Console Logs para Debug

Durante las pruebas, revisa los logs de Vercel para:

```
[resetPassword] Sending password reset email {
  email: "...",
  baseUrl: "https://academy.pimepanama.com",
  redirectTo: "https://academy.pimepanama.com/auth/callback"
}
```

```
[Auth Callback] Processing callback {
  hasCode: true,
  next: "/auth/reset-password",
  origin: "https://academy.pimepanama.com"
}
```

```
[Auth Callback] Successfully exchanged code for session
```

## Posibles Problemas y Soluciones

### Problema: Link apunta a localhost en producción

**Causa**: El `window.location.origin` no se está pasando correctamente

**Solución**:
1. Verificar que el código del cliente incluye: `formData.append('origin', window.location.origin)`
2. Verificar que el server action recibe el parámetro

### Problema: "Enlace de verificación inválido"

**Causa**: La Redirect URL no está configurada en Supabase

**Solución**:
1. Ir a Supabase Dashboard → Authentication → URL Configuration
2. Agregar la URL exacta del callback
3. Esperar unos minutos para que se propague

### Problema: "Error exchanging code for session"

**Causa**: El código ya fue usado o expiró

**Solución**:
1. Solicitar un nuevo password reset
2. Usar el link inmediatamente
3. No hacer click múltiples veces en el mismo link

### Problema: Redirección incorrecta después del callback

**Causa**: El parámetro `next` no se está respetando

**Solución**:
1. Verificar que el callback handler lee: `const next = requestUrl.searchParams.get('next')`
2. El default debe ser `/auth/reset-password`

## Verificación Final

Una vez que todos los tests pasen:

- [ ] ✅ Password reset funciona en producción para Suarez Academy
- [ ] ✅ Password reset funciona en localhost
- [ ] ✅ Links de email usan el dominio correcto
- [ ] ✅ Callback handler intercambia tokens correctamente
- [ ] ✅ Manejo de errores funciona apropiadamente
- [ ] ✅ Multi-academia funciona (si aplica)
- [ ] ✅ Console logs muestran información correcta
- [ ] ✅ No hay errores en Vercel logs

## Comandos Útiles

```bash
# Ver logs en tiempo real (Vercel CLI)
vercel logs --follow

# Buscar logs específicos
vercel logs | grep "resetPassword"
vercel logs | grep "Auth Callback"
```

---

**¿Encontraste un problema?** Documenta:
1. URL exacta donde ocurrió
2. Email usado para testing
3. Captura de pantalla del error
4. Logs de consola del navegador
5. Logs de Vercel (si tienes acceso)


