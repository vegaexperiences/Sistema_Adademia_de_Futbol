-- Script completo para resetear la plataforma a estado inicial (CERO DATOS)
-- ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos de forma PERMANENTE
-- Solo mantendrá las tablas y estructura, pero sin datos

BEGIN;

-- 1. Eliminar todos los registros de torneos
DELETE FROM tournament_registrations;
DELETE FROM tournaments;

-- 2. Eliminar todos los pagos
DELETE FROM payments;

-- 3. Eliminar todos los gastos
DELETE FROM expenses;

-- 4. Eliminar toda la cola de correos
DELETE FROM email_queue;

-- 5. Eliminar todas las plantillas de correo PERSONALIZADAS (mantener las 4 por defecto)
-- Solo elimina si quieres borrar plantillas adicionales que hayas creado
-- DELETE FROM email_templates WHERE name NOT IN ('pre_enrollment', 'player_accepted', 'payment_reminder', 'monthly_statement');

-- 6. Eliminar todos los jugadores
DELETE FROM players;

-- 7. Eliminar todas las familias
DELETE FROM families;

-- 8. OPCIONAL: Resetear configuraciones a valores por defecto
-- Descomentar si quieres resetear precios y métodos de pago
-- DELETE FROM settings WHERE key IN ('enrollment_price', 'monthly_fee_u10', 'monthly_fee_u12', 'monthly_fee_u14', 'monthly_fee_u16', 'monthly_fee_u18', 'payment_methods');

COMMIT;

-- Verificación: Mostrar conteo de registros en cada tabla
SELECT 'families' as tabla, COUNT(*) as registros FROM families
UNION ALL
SELECT 'players', COUNT(*) FROM players
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'email_queue', COUNT(*) FROM email_queue
UNION ALL
SELECT 'tournaments', COUNT(*) FROM tournaments
UNION ALL
SELECT 'tournament_registrations', COUNT(*) FROM tournament_registrations;

-- Mensaje de confirmación
SELECT '✅ Plataforma reseteada exitosamente. Todas las tablas están vacías.' as status;
