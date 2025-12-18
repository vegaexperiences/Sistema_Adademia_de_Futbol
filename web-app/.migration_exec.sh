#!/bin/bash
set -e

DB_PASSWORD="$1"
CONNECTION_STRING="postgresql://postgres.djfwxmvlmvtvlydkimyt:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "🚀 EJECUTANDO MIGRACIÓN SQL"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📍 Conectando a Supabase..."
echo ""

# Execute migration
psql "$CONNECTION_STRING" -f migrations/2024_12_18_remove_multi_tenant.sql

echo ""
echo "🔍 Validando resultado..."
echo ""

# Validate
psql "$CONNECTION_STRING" -t -c "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'academy_id';"

echo ""
echo "✅ Proceso completado"
