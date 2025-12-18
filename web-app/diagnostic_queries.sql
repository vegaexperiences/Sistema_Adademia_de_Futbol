-- ═══════════════════════════════════════════════════════
-- QUERIES DE DIAGNÓSTICO
-- Corre estas en Supabase SQL Editor para entender qué pasó
-- ═══════════════════════════════════════════════════════

-- 1. Ver CUÁLES tablas aún tienen academy_id
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'academy_id'
ORDER BY table_name;

-- 2. Verificar si las tablas multi-tenant aún existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('academies', 'super_admins');

-- 3. Ver si las RLS policies antiguas aún existen
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%academy%'
ORDER BY tablename, policyname;
