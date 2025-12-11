-- Script para normalizar el status de pagos de enrollment vinculados a jugadores aprobados
-- Todos los pagos de enrollment vinculados a jugadores aprobados deben tener status = 'Approved'

-- Disable trigger temporarily
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_payments_updated_at' 
        AND tgrelid = 'payments'::regclass
    ) THEN
        ALTER TABLE payments DISABLE TRIGGER update_payments_updated_at;
    END IF;
END $$;

-- Actualizar status de pagos de enrollment vinculados a jugadores aprobados
UPDATE payments p
SET status = 'Approved'
FROM players pl
WHERE p.player_id = pl.id
AND (p.type = 'enrollment' OR p.type = 'Matrícula')
AND pl.status IN ('Active', 'Scholarship')
AND p.status != 'Approved'
AND p.status IS NOT NULL;

-- Mostrar resumen de cambios
SELECT 
    'Pagos actualizados a Approved' as accion,
    COUNT(*) as cantidad
FROM payments p
JOIN players pl ON p.player_id = pl.id
WHERE p.player_id IS NOT NULL
AND (p.type = 'enrollment' OR p.type = 'Matrícula')
AND pl.status IN ('Active', 'Scholarship')
AND p.status = 'Approved';

-- Verificar pagos de enrollment vinculados y sus estados
SELECT 
    p.id as payment_id,
    p.player_id,
    pl.first_name || ' ' || pl.last_name as player_name,
    pl.status as player_status,
    p.amount,
    p.payment_date,
    p.status as payment_status,
    CASE 
        WHEN p.status = 'Approved' THEN '✅ Correcto'
        WHEN pl.status IN ('Active', 'Scholarship') THEN '⚠️ Debe ser Approved'
        ELSE 'ℹ️ Revisar'
    END as estado
FROM payments p
JOIN players pl ON p.player_id = pl.id
WHERE (p.type = 'enrollment' OR p.type = 'Matrícula')
AND p.player_id IS NOT NULL
ORDER BY p.payment_date DESC;

-- Re-enable trigger
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_payments_updated_at' 
        AND tgrelid = 'payments'::regclass
    ) THEN
        ALTER TABLE payments ENABLE TRIGGER update_payments_updated_at;
    END IF;
END $$;

