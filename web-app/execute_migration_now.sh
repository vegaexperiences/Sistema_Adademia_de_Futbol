#!/bin/bash
set -e

echo "🔐 EJECUTANDO MIGRACIÓN SQL"
echo "═══════════════════════════════════════════════════════"
echo ""

# Load environment
source .env.local 2>/dev/null || true

# Extract host from URL
DB_HOST=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | sed 's|http://||')
DB_HOST="${DB_HOST}.supabase.co"

echo "📍 Conectando a: $DB_HOST"
echo ""

# Check if password is in environment
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "⚠️  Necesito la contraseña de tu base de datos"
  echo "La encuentras en: Supabase Dashboard → Settings → Database"
  echo ""
  read -sp "Ingresa la contraseña de la BD: " DB_PASSWORD
  echo ""
else
  DB_PASSWORD="$SUPABASE_DB_PASSWORD"
  echo "✓ Usando contraseña de variable de entorno"
fi

echo ""
echo "⚠️  ÚLTIMA CONFIRMACIÓN"
echo "Esta migración eliminará:"
echo "  • Todas las columnas academy_id (22 tablas)"
echo "  • Tablas: academies, super_admins"
echo "  • Esto es IRREVERSIBLE"
echo ""
read -p "¿Continuar? (escribe SI en mayúsculas): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
  echo "❌ Cancelado"
  exit 1
fi

# Construct connection string
CONNECTION_STRING="postgresql://postgres.djfwxmvlmvtvlydkimyt:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo ""
echo "🚀 Ejecutando migración..."
echo ""

# Execute migration
if psql "$CONNECTION_STRING" -f migrations/2024_12_18_remove_multi_tenant.sql; then
  echo ""
  echo "✅ ¡Migración ejecutada!"
  echo ""
  echo "🔍 Validando resultado..."
  echo ""
  
  # Validate
  RESULT=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'academy_id';" 2>&1)
  
  if [ $? -eq 0 ]; then
    COUNT=$(echo "$RESULT" | tr -d ' ')
    if [ "$COUNT" = "0" ]; then
      echo "✅✅✅ ÉXITO TOTAL ✅✅✅"
      echo ""
      echo "✓ No quedan columnas academy_id"
      echo "✓ Migración completada exitosamente"
      echo ""
      echo "🎉 ¡El refactor está completo!"
    else
      echo "⚠️  Aún quedan $COUNT columnas academy_id"
      echo "Revisa el output arriba para detalles"
    fi
  fi
else
  echo ""
  echo "❌ Error ejecutando migración"
  exit 1
fi
