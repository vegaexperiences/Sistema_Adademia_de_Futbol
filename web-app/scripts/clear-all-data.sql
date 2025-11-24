-- Script para limpiar todos los datos de jugadores, familias y datos relacionados
-- ⚠️ CUIDADO: Esto borrará TODOS los datos de forma permanente

-- 1. Eliminar pagos (dependen de players)
DELETE FROM payments;

-- 2. Eliminar cola de correos
DELETE FROM email_queue;

-- 3. Eliminar registros de torneos (si existe la tabla)
DELETE FROM tournament_registrations;

-- 4. Eliminar jugadores (dependen de families)
DELETE FROM players;

-- 5. Eliminar familias
DELETE FROM families;

-- Reiniciar contadores de secuencias (opcional, para que los IDs empiecen desde 1)
-- No es necesario ya que usamos UUIDs, pero limpia metadata

-- Verificar que las tablas están vacías
SELECT 'families' as tabla, COUNT(*) as registros FROM families
UNION ALL
SELECT 'players', COUNT(*) FROM players
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'email_queue', COUNT(*) FROM email_queue;
