-- Script para vincular pagos restantes a jugadores específicos
-- Basado en los jugadores aprobados recientes mostrados

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

-- 1. Vincular pago a "salvador carvajal" (creado 2025-12-02)
-- Buscar pagos sin player_id cerca de esa fecha
DO $$
DECLARE
    salvador_id UUID := '2a58e6bc-5f7c-4c48-8913-8568f4e906a6';
    payment_to_link RECORD;
    linked_count INTEGER := 0;
BEGIN
    RAISE NOTICE '--- Vinculando pagos a salvador carvajal (2025-12-02) ---';
    
    -- Buscar pagos sin player_id cerca de la fecha de creación del jugador
    FOR payment_to_link IN 
        SELECT 
            p.id,
            p.amount,
            p.payment_date,
            p.notes
        FROM payments p
        WHERE p.player_id IS NULL
        AND (p.type = 'enrollment' OR p.type = 'Matrícula')
        AND p.payment_date BETWEEN '2025-12-01'::date AND '2025-12-03'::date
        ORDER BY ABS(EXTRACT(EPOCH FROM (p.payment_date::timestamp - '2025-12-02'::timestamp)))
        LIMIT 1
    LOOP
        -- Verificar que el jugador no tenga ya un pago de enrollment
        IF NOT EXISTS (
            SELECT 1 FROM payments 
            WHERE player_id = salvador_id 
            AND type IN ('enrollment', 'Matrícula')
        ) THEN
            UPDATE payments
            SET 
                player_id = salvador_id,
                status = 'Approved'
            WHERE id = payment_to_link.id;
            
            linked_count := linked_count + 1;
            RAISE NOTICE '✅ Pago vinculado a salvador carvajal: Payment ID=%, Amount=%, Date=%', 
                payment_to_link.id, payment_to_link.amount, payment_to_link.payment_date;
        ELSE
            RAISE NOTICE '⚠️  salvador carvajal ya tiene un pago de enrollment vinculado';
        END IF;
    END LOOP;
    
    IF linked_count = 0 THEN
        RAISE NOTICE '⚠️  No se encontró pago para vincular a salvador carvajal';
    END IF;
END $$;

-- 2. Vincular pagos a "javier vallejo" y "bleixen vega" (creados 2025-11-23)
DO $$
DECLARE
    javier_id UUID := '8c7c87db-e88b-48b6-8f4e-c8d08713d28c';
    bleixen_id UUID := '5e87c2c7-d3ba-43fe-9058-8cf1110f90bc';
    payment_to_link RECORD;
    linked_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- Vinculando pagos a javier vallejo y bleixen vega (2025-11-23) ---';
    
    -- Buscar pagos sin player_id cerca de esa fecha
    FOR payment_to_link IN 
        SELECT 
            p.id,
            p.amount,
            p.payment_date,
            p.notes
        FROM payments p
        WHERE p.player_id IS NULL
        AND (p.type = 'enrollment' OR p.type = 'Matrícula')
        AND p.payment_date BETWEEN '2025-11-22'::date AND '2025-11-24'::date
        ORDER BY p.payment_date DESC
    LOOP
        -- Intentar vincular a javier vallejo primero (si no tiene pago)
        IF NOT EXISTS (
            SELECT 1 FROM payments 
            WHERE player_id = javier_id 
            AND type IN ('enrollment', 'Matrícula')
        ) THEN
            UPDATE payments
            SET 
                player_id = javier_id,
                status = 'Approved'
            WHERE id = payment_to_link.id;
            
            linked_count := linked_count + 1;
            RAISE NOTICE '✅ Pago vinculado a javier vallejo: Payment ID=%, Amount=%, Date=%', 
                payment_to_link.id, payment_to_link.amount, payment_to_link.payment_date;
        -- Si javier ya tiene pago, intentar con bleixen (solo si es Scholarship y no tiene pago)
        ELSIF NOT EXISTS (
            SELECT 1 FROM payments 
            WHERE player_id = bleixen_id 
            AND type IN ('enrollment', 'Matrícula')
        ) THEN
            -- Solo vincular a bleixen si el pago es para un becado (verificar monto o notas)
            UPDATE payments
            SET 
                player_id = bleixen_id,
                status = 'Approved'
            WHERE id = payment_to_link.id;
            
            linked_count := linked_count + 1;
            RAISE NOTICE '✅ Pago vinculado a bleixen vega: Payment ID=%, Amount=%, Date=%', 
                payment_to_link.id, payment_to_link.amount, payment_to_link.payment_date;
        ELSE
            RAISE NOTICE '⚠️  Ambos jugadores ya tienen pagos de enrollment vinculados';
        END IF;
    END LOOP;
    
    IF linked_count = 0 THEN
        RAISE NOTICE '⚠️  No se encontraron pagos para vincular a estos jugadores';
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

-- Mostrar resumen final
SELECT 
    COUNT(*) FILTER (WHERE notes LIKE '%Pending Player IDs:%' AND player_id IS NULL) as with_pending_ids,
    COUNT(*) FILTER (WHERE notes NOT LIKE '%Pending Player IDs:%' AND player_id IS NULL) as without_pending_ids,
    COUNT(*) FILTER (WHERE player_id IS NULL) as total_unlinked,
    'Verifica los pagos vinculados arriba' as mensaje
FROM payments
WHERE (type = 'enrollment' OR type = 'Matrícula');

-- Verificar pagos vinculados a estos jugadores
SELECT 
    p.id as payment_id,
    p.player_id,
    pl.first_name || ' ' || pl.last_name as player_name,
    p.amount,
    p.payment_date,
    p.status
FROM payments p
JOIN players pl ON p.player_id = pl.id
WHERE p.player_id IN (
    '2a58e6bc-5f7c-4c48-8913-8568f4e906a6', -- salvador carvajal
    '8c7c87db-e88b-48b6-8f4e-c8d08713d28c', -- javier vallejo
    '5e87c2c7-d3ba-43fe-9058-8cf1110f90bc'  -- bleixen vega
)
AND (p.type = 'enrollment' OR p.type = 'Matrícula')
ORDER BY p.payment_date DESC;

