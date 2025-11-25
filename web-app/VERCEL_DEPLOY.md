# 🚀 Guía de Despliegue en Vercel

## ✅ Preparación

1. **Variables de Entorno en Vercel**

Ve a tu proyecto en Vercel → Settings → Environment Variables y agrega:

### Variables Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Brevo
BREVO_API_KEY=tu_brevo_api_key
BREVO_FROM_EMAIL=noreply@tudominio.com
BREVO_WEBHOOK_SECRET=tu_webhook_secret

# Opcional pero recomendado
NEXT_PUBLIC_LOGO_URL=https://tudominio.vercel.app/logo.png
CRON_SECRET=tu_secret_para_cron_jobs
NODE_ENV=production
```

### ⚠️ Importante

- Asegúrate de agregar estas variables para **Production**, **Preview**, y **Development**
- `BREVO_FROM_EMAIL` debe ser un email verificado en tu cuenta de Brevo
- `CRON_SECRET` es opcional pero recomendado para seguridad

## 🔗 Conexión con GitHub

1. **Ve a Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Importa el Repositorio**
   - Click en "Add New..." → "Project"
   - Conecta tu cuenta de GitHub si no lo has hecho
   - Selecciona el repositorio: `vegaexperiences/Sistema_Adademia_de_Futbol`
   - Selecciona la raíz del proyecto: `web-app`

3. **Configuración del Proyecto**
   - Framework Preset: Next.js (detectado automáticamente)
   - Root Directory: `web-app`
   - Build Command: `npm run build` (automático)
   - Output Directory: `.next` (automático)
   - Install Command: `npm install` (automático)

## 🔧 Configuración Adicional

### Cron Jobs

El cron job para procesar emails está configurado en `vercel.json`:
- **Ruta**: `/api/cron/process-emails`
- **Horario**: Diario a las 9:00 AM (0 9 * * *)

Vercel automáticamente ejecutará este endpoint según el horario configurado.

### Webhooks de Brevo

Después del despliegue, configura el webhook en Brevo:

1. Ve a tu cuenta de Brevo → Settings → Webhooks
2. Agrega un nuevo webhook:
   - **URL**: `https://tu-dominio.vercel.app/api/webhooks/brevo`
   - **Secret**: El mismo que configuraste en `BREVO_WEBHOOK_SECRET`
   - **Eventos**: Selecciona todos los eventos de email

## 🚀 Desplegar

### Opción 1: Desde GitHub (Automático)

1. Haz push a la rama `main` o `dev`:
   ```bash
   git push origin dev
   ```

2. Vercel automáticamente detectará el push y desplegará

### Opción 2: Desde Vercel CLI

1. **Instalar Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Iniciar sesión**:
   ```bash
   vercel login
   ```

3. **Desplegar**:
   ```bash
   cd "/Users/javiervallejo/Documents/Websites/Sistema de control de Futbol/web-app"
   vercel --prod
   ```

## ✅ Verificación Post-Despliegue

1. **Verifica el Build**:
   - Revisa los logs de build en Vercel Dashboard
   - Asegúrate de que no hay errores

2. **Prueba el Sitio**:
   - Visita tu URL de Vercel (ej: `tu-proyecto.vercel.app`)
   - Verifica que la aplicación carga correctamente

3. **Prueba el Cron Job**:
   - Puedes probar manualmente visitando:
     ```
     https://tu-dominio.vercel.app/api/cron/process-emails
     ```
   - O usando POST:
     ```bash
     curl -X POST https://tu-dominio.vercel.app/api/cron/process-emails
     ```

4. **Verifica Webhooks**:
   - Envía un email de prueba
   - Revisa los logs en Vercel para ver si el webhook se recibe

## 📊 Monitoreo

- **Logs**: Vercel Dashboard → Tu Proyecto → Logs
- **Analytics**: Vercel Dashboard → Tu Proyecto → Analytics
- **Cron Jobs**: Vercel Dashboard → Tu Proyecto → Cron Jobs

## 🔄 Actualizaciones

Cada push a la rama conectada automáticamente desplegará una nueva versión. Vercel crea:
- **Production**: Para la rama `main` (o la que configures)
- **Preview**: Para otras ramas y PRs

## 🆘 Troubleshooting

### Error de Build

Si el build falla:
1. Revisa los logs en Vercel Dashboard
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que `package.json` tenga todas las dependencias

### Error de Runtime

Si la aplicación falla en runtime:
1. Revisa los logs en tiempo real en Vercel Dashboard
2. Verifica las variables de entorno
3. Asegúrate de que la base de datos tenga las migraciones aplicadas

### Cron Job No Funciona

1. Verifica que `vercel.json` tenga la configuración de cron
2. Revisa los logs del cron job en Vercel Dashboard
3. Verifica que el endpoint `/api/cron/process-emails` responda correctamente

---

**¿Necesitas ayuda?** Revisa los logs en Vercel Dashboard o consulta la documentación de Vercel.

