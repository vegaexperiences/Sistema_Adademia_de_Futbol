-- Script para corregir pagos específicos:
-- 1. salvador carvajal: cambiar monto de $80 a $50
-- 2. bleixen vega: eliminar pago de enrollment (es becada, no paga)

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

-- 1. Corregir monto de salvador carvajal
DO $$
DECLARE
    salvador_id UUID := '2a58e6bc-5f7c-4c48-8913-8568f4e906a6';
    payment_id_to_update UUID;
BEGIN
    RAISE NOTICE '--- Corrigiendo monto de salvador carvajal ---';
    
    -- Buscar el pago de enrollment de salvador carvajal
    SELECT p.id INTO payment_id_to_update
    FROM payments p
    WHERE p.player_id = salvador_id
    AND (p.type = 'enrollment' OR p.type = 'Matrícula')
    ORDER BY p.payment_date DESC
    LIMIT 1;
    
    IF payment_id_to_update IS NOT NULL THEN
        UPDATE payments
        SET amount = 50.00
        WHERE id = payment_id_to_update;
        
        RAISE NOTICE '✅ Monto actualizado: Payment ID=%, Nuevo monto=$50.00', payment_id_to_update;
    ELSE
        RAISE NOTICE '⚠️  No se encontró pago de enrollment para salvador carvajal';
    END IF;
END $$;

-- 2. Eliminar pago de enrollment de bleixen vega (es becada)
DO $$
DECLARE
    bleixen_id UUID := '5e87c2c7-d3ba-43fe-9058-8cf1110f90bc';
    payment_id_to_delete UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- Eliminando pago de enrollment de bleixen vega (es becada) ---';
    
    -- Buscar el pago de enrollment de bleixen vega
    SELECT p.id INTO payment_id_to_delete
    FROM payments p
    WHERE p.player_id = bleixen_id
    AND (p.type = 'enrollment' OR p.type = 'Matrícula')
    ORDER BY p.payment_date DESC
    LIMIT 1;
    
    IF payment_id_to_delete IS NOT NULL THEN
        DELETE FROM payments
        WHERE id = payment_id_to_delete;
        
        RAISE NOTICE '✅ Pago eliminado: Payment ID=% (bleixen vega es becada, no paga enrollment)', payment_id_to_delete;
    ELSE
        RAISE NOTICE '⚠️  No se encontró pago de enrollment para bleixen vega';
    END IF;
END $$;

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

-- Verificar correcciones
SELECT 
    p.id as payment_id,
    p.player_id,
    pl.first_name || ' ' || pl.last_name as player_name,
    pl.status as player_status,
    p.amount,
    p.payment_date,
    p.status as payment_status,
    CASE 
        WHEN pl.status = 'Scholarship' AND (p.type = 'enrollment' OR p.type = 'Matrícula') THEN '❌ ERROR: Becado no debe tener pago de enrollment'
        WHEN pl.first_name || ' ' || pl.last_name = 'salvador carvajal' AND p.amount != 50.00 THEN '⚠️ Monto incorrecto (debe ser $50)'
        ELSE '✅ Correcto'
    END as estado
FROM payments p
JOIN players pl ON p.player_id = pl.id
WHERE p.player_id IN (
    '2a58e6bc-5f7c-4c48-8913-8568f4e906a6', -- salvador carvajal
    '5e87c2c7-d3ba-43fe-9058-8cf1110f90bc'  -- bleixen vega
)
AND (p.type = 'enrollment' OR p.type = 'Matrícula')
ORDER BY pl.first_name;

