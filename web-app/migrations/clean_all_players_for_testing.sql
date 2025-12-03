-- Script para limpiar TODOS los jugadores y datos relacionados para pruebas
-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los jugadores, pagos y familias
-- Solo ejecutar en ambiente de desarrollo/testing

-- Deshabilitar triggers y restricciones temporalmente
DO $$
BEGIN
    -- Deshabilitar trigger de updated_at en payments
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_payments_updated_at' 
        AND tgrelid = 'payments'::regclass
    ) THEN
        ALTER TABLE payments DISABLE TRIGGER update_payments_updated_at;
    END IF;
    
    -- Deshabilitar trigger de updated_at en players
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_players_updated_at' 
        AND tgrelid = 'players'::regclass
    ) THEN
        ALTER TABLE players DISABLE TRIGGER update_players_updated_at;
    END IF;
    
    -- Deshabilitar RLS temporalmente si está habilitado
    ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE players DISABLE ROW LEVEL SECURITY;
    ALTER TABLE pending_players DISABLE ROW LEVEL SECURITY;
    ALTER TABLE families DISABLE ROW LEVEL SECURITY;
END $$;

-- 1. Eliminar todos los pagos PRIMERO (para evitar problemas de foreign keys)
DO $$
DECLARE
    payments_count INTEGER;
    deleted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO payments_count FROM payments;
    
    -- Eliminar con TRUNCATE para ser más eficiente y evitar problemas de FK
    TRUNCATE TABLE payments CASCADE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Eliminados % pagos (de % encontrados)', deleted_count, payments_count;
END $$;

-- 2. Eliminar todos los jugadores aprobados
DO $$
DECLARE
    players_count INTEGER;
    deleted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO players_count FROM players;
    
    -- Primero eliminar referencias de family_id
    UPDATE players SET family_id = NULL WHERE family_id IS NOT NULL;
    
    -- Luego eliminar los jugadores
    DELETE FROM players;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Eliminados % jugadores aprobados (de % encontrados)', deleted_count, players_count;
END $$;

-- 3. Eliminar todos los jugadores pendientes
DO $$
DECLARE
    pending_count INTEGER;
    deleted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pending_count FROM pending_players;
    
    -- Primero eliminar referencias de family_id
    UPDATE pending_players SET family_id = NULL WHERE family_id IS NOT NULL;
    
    -- Luego eliminar los jugadores pendientes
    DELETE FROM pending_players;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Eliminados % jugadores pendientes (de % encontrados)', deleted_count, pending_count;
END $$;

-- 4. Eliminar todos los jugadores rechazados (si existe la tabla)
DO $$
DECLARE
    rejected_count INTEGER;
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rejected_players') THEN
        SELECT COUNT(*) INTO rejected_count FROM rejected_players;
        
        UPDATE rejected_players SET family_id = NULL WHERE family_id IS NOT NULL;
        
        DELETE FROM rejected_players;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        RAISE NOTICE 'Eliminados % jugadores rechazados (de % encontrados)', deleted_count, rejected_count;
    END IF;
END $$;

-- 5. Eliminar todas las familias (ya que no tienen jugadores)
DO $$
DECLARE
    families_count INTEGER;
    deleted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO families_count FROM families;
    
    DELETE FROM families;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Eliminadas % familias (de % encontradas)', deleted_count, families_count;
END $$;

-- 5. Limpiar registros relacionados en otras tablas (si existen)
-- Eliminar registros de torneos relacionados con jugadores
DO $$
DECLARE
    tournament_registrations_count INTEGER;
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_registrations') THEN
        SELECT COUNT(*) INTO tournament_registrations_count FROM tournament_registrations;
        DELETE FROM tournament_registrations;
        RAISE NOTICE 'Eliminados % registros de torneos', tournament_registrations_count;
    END IF;
END $$;

-- 6. Resetear secuencias si es necesario (opcional)
-- Las secuencias de UUID no necesitan reset, pero si hay IDs numéricos, se pueden resetear aquí

-- Rehabilitar triggers y RLS
DO $$
BEGIN
    -- Rehabilitar trigger de updated_at en payments
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_payments_updated_at' 
        AND tgrelid = 'payments'::regclass
    ) THEN
        ALTER TABLE payments ENABLE TRIGGER update_payments_updated_at;
    END IF;
    
    -- Rehabilitar trigger de updated_at en players
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_players_updated_at' 
        AND tgrelid = 'players'::regclass
    ) THEN
        ALTER TABLE players ENABLE TRIGGER update_players_updated_at;
    END IF;
    
    -- Rehabilitar RLS
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE players ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pending_players ENABLE ROW LEVEL SECURITY;
    ALTER TABLE families ENABLE ROW LEVEL SECURITY;
END $$;

-- Mostrar resumen final
DO $$
DECLARE
    remaining_players INTEGER;
    remaining_pending INTEGER;
    remaining_payments INTEGER;
    remaining_families INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_players FROM players;
    SELECT COUNT(*) INTO remaining_pending FROM pending_players;
    SELECT COUNT(*) INTO remaining_payments FROM payments;
    SELECT COUNT(*) INTO remaining_families FROM families;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LIMPIEZA COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Jugadores aprobados restantes: %', remaining_players;
    RAISE NOTICE 'Jugadores pendientes restantes: %', remaining_pending;
    RAISE NOTICE 'Pagos restantes: %', remaining_payments;
    RAISE NOTICE 'Familias restantes: %', remaining_families;
    RAISE NOTICE '========================================';
    
    IF remaining_players > 0 OR remaining_pending > 0 OR remaining_payments > 0 THEN
        RAISE WARNING '⚠️ Algunos registros no se eliminaron. Verificar dependencias.';
    ELSE
        RAISE NOTICE '✅ Base de datos limpiada completamente';
    END IF;
END $$;

-- Verificar que las tablas estén vacías
SELECT 
    'players' as tabla,
    COUNT(*) as registros_restantes
FROM players
UNION ALL
SELECT 
    'pending_players' as tabla,
    COUNT(*) as registros_restantes
FROM pending_players
UNION ALL
SELECT 
    'payments' as tabla,
    COUNT(*) as registros_restantes
FROM payments
UNION ALL
SELECT 
    'families' as tabla,
    COUNT(*) as registros_restantes
FROM families;

