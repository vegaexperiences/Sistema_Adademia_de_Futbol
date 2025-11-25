# Suarez Academy - Sistema de Gestión de Fútbol

Sistema integral de gestión para Suarez Academy. Administra jugadores, familias, pagos, gastos, torneos y comunicaciones por email.

## 🚀 Características

- **Gestión de Jugadores**: Registro completo con categorías, estados y documentos
- **Familias y Tutores**: Vinculación de jugadores con familias y tutores
- **Sistema Financiero**: 
  - Pagos (matrículas, mensualidades, torneos)
  - Gastos y control de personal
  - Reportes financieros con gráficas
- **Sistema de Matrículas**: Formulario multi-paso para nuevas inscripciones
- **Gestión de Torneos**: Registro y administración de torneos
- **Sistema de Emails**: 
  - Plantillas personalizables
  - Cola de emails con límite diario
  - Tracking de emails (aperturas, clics, rebotes)
- **Dashboard Administrativo**: Panel completo de gestión
- **Reportes**: Generación de reportes financieros y de jugadores

## 🛠️ Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Email**: Brevo (anteriormente Sendinblue)
- **UI**: Tailwind CSS, Radix UI
- **Validación**: Zod
- **Gráficas**: Recharts

## 📋 Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- Cuenta de Brevo (para envío de emails)

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/vegaexperiences/Sistema_Adademia_de_Futbol.git
cd Sistema_Adademia_de_Futbol/web-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Brevo
BREVO_API_KEY=tu_brevo_api_key
BREVO_FROM_EMAIL=noreply@tudominio.com
BREVO_WEBHOOK_SECRET=tu_webhook_secret

# Opcional
NEXT_PUBLIC_LOGO_URL=https://tudominio.com/logo.png
CRON_SECRET=tu_secret_para_cron_jobs
```

4. **Configurar la base de datos**

Ejecuta las migraciones en orden:

```bash
# Ejecutar schema.sql primero
# Luego ejecutar las migraciones en migrations/
psql -U postgres -d tu_database < schema.sql
psql -U postgres -d tu_database < migrations/create_email_system.sql
psql -U postgres -d tu_database < migrations/migrate_resend_to_brevo.sql
# ... etc
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
web-app/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Páginas del dashboard
│   │   └── enrollment/   # Formulario de matrícula
│   ├── components/       # Componentes React
│   ├── lib/
│   │   ├── actions/      # Server actions
│   │   ├── brevo/        # Cliente de Brevo
│   │   ├── supabase/     # Clientes de Supabase
│   │   ├── validations/  # Schemas de Zod
│   │   └── utils/        # Utilidades
│   └── ...
├── migrations/           # Migraciones de base de datos
├── scripts/              # Scripts de utilidad
└── public/               # Archivos estáticos
```

## 🔐 Seguridad

- **Row Level Security (RLS)**: Habilitado en todas las tablas
- **Validación de Datos**: Zod para validación de formularios
- **Webhook Signatures**: Verificación de firmas para webhooks de Brevo
- **Variables de Entorno**: Validación al inicio de la aplicación
- **Error Handling**: Manejo seguro de errores sin exponer detalles internos

## 📧 Configuración de Brevo

1. Crea una cuenta en [Brevo](https://www.brevo.com/)
2. Obtén tu API Key desde el panel de administración
3. Configura un webhook en Brevo apuntando a: `https://tudominio.com/api/webhooks/brevo`
4. Agrega el secret del webhook a `BREVO_WEBHOOK_SECRET`

Eventos soportados:
- `sent` - Email enviado
- `delivered` - Email entregado
- `opened` - Email abierto
- `click` - Link clickeado
- `bounce` / `hardBounce` / `softBounce` - Rebotes
- `spam` - Marcado como spam
- `blocked` - Bloqueado

## 🔄 Cron Jobs

El sistema incluye un cron job para procesar la cola de emails diariamente:

```bash
# Configurar en Vercel o tu proveedor de hosting
# URL: /api/cron/process-emails
# Schedule: 0 9 * * * (diario a las 9 AM)
# Header: Authorization: Bearer ${CRON_SECRET}
```

## 🗄️ Base de Datos

### Tablas Principales

- `families` - Familias y tutores
- `players` - Jugadores
- `payments` - Pagos
- `expenses` - Gastos
- `email_queue` - Cola de emails
- `email_templates` - Plantillas de email
- `tournaments` - Torneos
- `settings` - Configuraciones del sistema

Ver `schema.sql` para el esquema completo.

## 🧪 Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build de producción
npm run start        # Iniciar servidor de producción
npm run lint         # Linter
```

Scripts adicionales en `/scripts`:
- `send-test-email.ts` - Enviar email de prueba
- `import-players.ts` - Importar jugadores desde CSV
- `setup-settings.ts` - Configurar valores iniciales

## 📝 Migraciones

El proyecto usa migraciones SQL incrementales. Ejecuta en orden:

1. `schema.sql` - Esquema base
2. `migrations/create_email_system.sql`
3. `migrations/create_financial_system.sql`
4. `migrations/create_payments_system.sql`
5. `migrations/create_tournaments_table.sql`
6. `migrations/create_settings_table.sql`
7. `migrations/add_email_tracking.sql`
8. `migrations/add_proof_url_to_payments.sql`
9. `migrations/add_document_columns.sql`
10. `migrations/migrate_resend_to_brevo.sql`

## 🚢 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega

### Otros Proveedores

El proyecto es compatible con cualquier proveedor que soporte Next.js:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y propiedad de Suarez Academy.

## 👥 Soporte

Para soporte, contacta al equipo de desarrollo o abre un issue en GitHub.

## 📚 Documentación Adicional

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Brevo API Documentation](https://developers.brevo.com/)
- [Zod Documentation](https://zod.dev/)

---

**Desarrollado para Suarez Academy** ⚽
