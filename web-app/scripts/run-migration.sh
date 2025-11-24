#!/bin/bash

# Load environment variables from .env.local
export $(cat .env.local | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env.local"
  exit 1
fi

echo "🚀 Running settings migration..."
echo "Database: $DATABASE_URL"

# Run migration
/opt/homebrew/opt/postgresql@15/bin/psql "$DATABASE_URL" -f migrations/create_settings_table.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully!"
else
  echo "❌ Migration failed"
  exit 1
fi
