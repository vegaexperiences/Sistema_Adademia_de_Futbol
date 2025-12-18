#!/bin/bash

# Load environment variables
source .env.local 2>/dev/null || true

# Extract DB credentials from SUPABASE_URL
# Format: https://project-ref.supabase.co
DB_HOST=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | sed 's|http://||')

echo "🔐 Para ejecutar la migración necesito la contraseña de tu base de datos"
echo "La encuentras en: Supabase Dashboard → Settings → Database → Database Password"
echo ""
read -sp "Ingresa la contraseña de Supabase: " DB_PASSWORD
echo ""

# Construct connection string
CONNECTION_STRING="postgresql://postgres:$DB_PASSWORD@$DB_HOST:5432/postgres"

echo ""
echo "⚠️  ÚLTIMA ADVERTENCIA ⚠️"
echo "Esto ejecutará la migración que:"
echo "  • Eliminará todas las columnas academy_id"
echo "  • Eliminará tablas academies y super_admins"
echo "  • Esta operación es IRREVERSIBLE"
echo ""
read -p "¿Continuar? (escribe 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
  echo "❌ Cancelado por el usuario"
  exit 1
fi

echo ""
echo "🚀 Ejecutando migración..."
echo ""

# Execute migration
psql "$CONNECTION_STRING" -f migrations/2024_12_18_remove_multi_tenant.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ ¡Migración completada!"
  echo ""
  echo "🔍 Validando resultado..."
  echo ""
  
  # Validate
  psql "$CONNECTION_STRING" -c "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'academy_id';"
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Validación completada"
    echo "Si ves 0 rows arriba, la migración fue exitosa"
  fi
else
  echo ""
  echo "❌ Error ejecutando migración"
  echo "Revisa el output arriba para detalles"
  exit 1
fi
