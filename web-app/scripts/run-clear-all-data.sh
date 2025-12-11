#!/bin/bash

# Script para ejecutar la limpieza completa de datos usando SQL directo
# Requiere que DATABASE_URL esté configurado en .env.local

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env.local"
  echo ""
  echo "Por favor, configura DATABASE_URL en .env.local con la conexión directa a PostgreSQL."
  echo "Formato: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
  echo ""
  echo "Alternativamente, puedes ejecutar el script SQL directamente en Supabase:"
  echo "1. Ve a https://supabase.com/dashboard"
  echo "2. Selecciona tu proyecto"
  echo "3. Ve a SQL Editor"
  echo "4. Copia y pega el contenido de scripts/clear-all-data-complete.sql"
  echo "5. Ejecuta el script"
  exit 1
fi

echo "⚠️  ADVERTENCIA: Este script eliminará TODOS los datos de la base de datos"
echo ""
read -p "¿Estás SEGURO de que quieres continuar? (escribe 'SI' para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
  echo "❌ Operación cancelada."
  exit 0
fi

echo ""
echo "🚀 Ejecutando limpieza de datos..."
echo ""

# Check if psql is available
if command -v psql &> /dev/null; then
  PSQL_CMD="psql"
elif command -v /opt/homebrew/opt/postgresql@15/bin/psql &> /dev/null; then
  PSQL_CMD="/opt/homebrew/opt/postgresql@15/bin/psql"
else
  echo "❌ psql no encontrado. Por favor instala PostgreSQL client."
  echo ""
  echo "Alternativamente, ejecuta el script SQL directamente en Supabase SQL Editor:"
  echo "scripts/clear-all-data-complete.sql"
  exit 1
fi

# Run the SQL script
$PSQL_CMD "$DATABASE_URL" -f scripts/clear-all-data-complete.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Limpieza completada exitosamente!"
  echo "La base de datos está lista para cargar datos finales."
else
  echo ""
  echo "❌ Error durante la limpieza"
  exit 1
fi

