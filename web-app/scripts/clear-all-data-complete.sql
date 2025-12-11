-- Script completo para borrar TODOS los datos de la base de datos
-- ⚠️ ADVERTENCIA CRÍTICA: Esto eliminará TODOS los datos de forma PERMANENTE
-- Solo mantendrá la estructura de las tablas, pero sin datos
-- 
-- USO: Ejecutar este script cuando necesites limpiar completamente la base de datos
-- para cargar datos finales o hacer un reset completo

BEGIN;

-- ============================================
-- 1. ELIMINAR DATOS DE PAGOS Y TRANSACCIONES
-- ============================================

-- Eliminar órdenes temporales de Yappy
DELETE FROM yappy_orders;

-- Eliminar todos los pagos (dependen de players)
DELETE FROM payments;

-- Eliminar pagos de personal
DELETE FROM staff_payments;

-- ============================================
-- 2. ELIMINAR DATOS FINANCIEROS
-- ============================================

-- Eliminar gastos recurrentes
DELETE FROM expense_recurrence;

-- Eliminar todos los gastos
DELETE FROM expenses;

-- Eliminar categorías de gastos (opcional, puedes mantenerlas si quieres)
DELETE FROM expense_categories;

-- ============================================
-- 3. ELIMINAR DATOS DE PERSONAL
-- ============================================

-- Eliminar personal (debe ir después de staff_payments)
DELETE FROM staff;

-- ============================================
-- 4. ELIMINAR DATOS DE TORNEOS
-- ============================================

-- Eliminar registros de torneos (dependen de tournaments)
DELETE FROM tournament_registrations;

-- Eliminar torneos
DELETE FROM tournaments;

-- ============================================
-- 5. ELIMINAR DATOS DE CORREOS
-- ============================================

-- Eliminar cola de correos
DELETE FROM email_queue;

-- Eliminar plantillas de correo personalizadas (mantener las 4 por defecto)
-- Descomentar la siguiente línea si quieres borrar TODAS las plantillas
-- DELETE FROM email_templates WHERE name NOT IN ('pre_enrollment', 'player_accepted', 'payment_reminder', 'monthly_statement');

-- ============================================
-- 6. ELIMINAR DATOS DE JUGADORES
-- ============================================

-- Eliminar jugadores pendientes
DELETE FROM pending_players;

-- Eliminar jugadores rechazados
DELETE FROM rejected_players;

-- Eliminar jugadores aprobados (dependen de families)
DELETE FROM players;

-- ============================================
-- 7. ELIMINAR DATOS DE FAMILIAS
-- ============================================

-- Eliminar familias (deben ir después de players)
DELETE FROM families;

-- ============================================
-- 8. ELIMINAR CONFIGURACIONES (OPCIONAL)
-- ============================================

-- Descomentar las siguientes líneas si quieres resetear también las configuraciones
-- DELETE FROM settings;
-- DELETE FROM system_config;

COMMIT;

-- ============================================
-- VERIFICACIÓN: Mostrar conteo de registros
-- ============================================

SELECT 'families' as tabla, COUNT(*) as registros FROM families
UNION ALL
SELECT 'players', COUNT(*) FROM players
UNION ALL
SELECT 'pending_players', COUNT(*) FROM pending_players
UNION ALL
SELECT 'rejected_players', COUNT(*) FROM rejected_players
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'staff', COUNT(*) FROM staff
UNION ALL
SELECT 'staff_payments', COUNT(*) FROM staff_payments
UNION ALL
SELECT 'expense_categories', COUNT(*) FROM expense_categories
UNION ALL
SELECT 'expense_recurrence', COUNT(*) FROM expense_recurrence
UNION ALL
SELECT 'email_queue', COUNT(*) FROM email_queue
UNION ALL
SELECT 'tournaments', COUNT(*) FROM tournaments
UNION ALL
SELECT 'tournament_registrations', COUNT(*) FROM tournament_registrations
UNION ALL
SELECT 'yappy_orders', COUNT(*) FROM yappy_orders
ORDER BY tabla;

-- Mensaje de confirmación
SELECT '✅ Base de datos limpiada exitosamente. Todas las tablas están vacías.' as status;

