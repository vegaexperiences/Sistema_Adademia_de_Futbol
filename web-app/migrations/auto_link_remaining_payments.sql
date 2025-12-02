-- Script para vincular automáticamente pagos restantes cuando sea posible
-- Este script intenta vincular pagos basándose en coincidencias claras

-- Disable trigger temporarily to avoid updated_at errors
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

DO $$
DECLARE
    payment_record RECORD;
    pending_uuids UUID[];
    player_uuid UUID;
    linked_count INTEGER := 0;
    pending_count INTEGER := 0;
    not_found_count INTEGER := 0;
BEGIN
    RAISE NOTICE '--- Iniciando vinculación automática de pagos restantes ---';
    RAISE NOTICE '';
    
    -- 1. Intentar vincular pagos con "Pending Player IDs" que ahora tienen jugadores aprobados
    RAISE NOTICE '--- Paso 1: Revisando pagos con Pending Player IDs ---';
    
    FOR payment_record IN 
        SELECT 
            id,
            amount,
            type,
            method,
            status,
            notes,
            payment_date
        FROM payments
        WHERE player_id IS NULL
        AND (type = 'enrollment' OR type = 'Matrícula')
        AND notes LIKE '%Pending Player IDs:%'
        ORDER BY payment_date DESC
    LOOP
        -- Extraer UUIDs de las notas
        SELECT array_agg(match[1]::UUID)
        INTO pending_uuids
        FROM regexp_matches(payment_record.notes, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'gi') AS match;
        
        IF array_length(pending_uuids, 1) > 0 THEN
            -- Buscar si alguno de los UUIDs existe en players
            SELECT id INTO player_uuid
            FROM players
            WHERE id = ANY(pending_uuids)
            LIMIT 1;
            
            IF player_uuid IS NOT NULL THEN
                -- Vincular el pago
                UPDATE payments
                SET 
                    player_id = player_uuid,
                    status = CASE 
                        WHEN status = 'Pending' THEN 'Approved'
                        WHEN status IS NULL THEN 'Approved'
                        ELSE status
                    END
                WHERE id = payment_record.id;
                
                linked_count := linked_count + 1;
                RAISE NOTICE '✅ Pago vinculado: Payment ID=%, Player ID=%, Amount=%', 
                    payment_record.id, player_uuid, payment_record.amount;
            ELSE
                -- Verificar si está en pending_players
                IF EXISTS(SELECT 1 FROM pending_players WHERE id = ANY(pending_uuids)) THEN
                    pending_count := pending_count + 1;
                    RAISE NOTICE '⏳ Pago pendiente: Payment ID=%, Pending IDs=% (jugador aún no aprobado)', 
                        payment_record.id, array_to_string(pending_uuids, ', ');
                ELSE
                    not_found_count := not_found_count + 1;
                    RAISE NOTICE '❌ Pago sin jugador: Payment ID=%, Pending IDs=% (UUIDs no encontrados)', 
                        payment_record.id, array_to_string(pending_uuids, ', ');
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '--- Paso 2: Intentando vincular pagos sin formato esperado (coincidencias por fecha) ---';
    
    -- 2. Intentar vincular pagos sin formato basándose en fecha cercana (≤7 días)
    -- Solo para pagos que no tienen "Pending Player IDs"
    FOR payment_record IN 
        SELECT 
            p.id,
            p.amount,
            p.payment_date,
            p.notes
        FROM payments p
        WHERE p.player_id IS NULL
        AND (p.type = 'enrollment' OR p.type = 'Matrícula')
        AND p.notes NOT LIKE '%Pending Player IDs:%'
        ORDER BY p.payment_date DESC
    LOOP
        -- Buscar jugadores aprobados creados dentro de 7 días de la fecha del pago
        SELECT pl.id INTO player_uuid
        FROM players pl
        WHERE pl.status IN ('Active', 'Scholarship')
        AND ABS(EXTRACT(EPOCH FROM (payment_record.payment_date::timestamp - pl.created_at::timestamp))) / 86400 <= 7
        AND NOT EXISTS (
            SELECT 1 FROM payments p2 
            WHERE p2.player_id = pl.id 
            AND p2.type IN ('enrollment', 'Matrícula')
            AND ABS(EXTRACT(EPOCH FROM (p2.payment_date::timestamp - payment_record.payment_date::timestamp))) / 86400 <= 7
        )
        ORDER BY ABS(EXTRACT(EPOCH FROM (payment_record.payment_date::timestamp - pl.created_at::timestamp)))
        LIMIT 1;
        
        IF player_uuid IS NOT NULL THEN
            -- Vincular el pago
            UPDATE payments
            SET 
                player_id = player_uuid,
                status = CASE 
                    WHEN status = 'Pending' THEN 'Approved'
                    WHEN status IS NULL THEN 'Approved'
                    ELSE status
                END
            WHERE id = payment_record.id;
            
            linked_count := linked_count + 1;
            RAISE NOTICE '✅ Pago vinculado por fecha: Payment ID=%, Player ID=%, Payment Date=%, Amount=%', 
                payment_record.id, player_uuid, payment_record.payment_date, payment_record.amount;
        ELSE
            not_found_count := not_found_count + 1;
            RAISE NOTICE '⚠️  No se encontró coincidencia: Payment ID=%, Payment Date=%, Amount=%', 
                payment_record.id, payment_record.payment_date, payment_record.amount;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '--- Resumen de vinculación automática ---';
    RAISE NOTICE 'Pagos vinculados automáticamente: %', linked_count;
    RAISE NOTICE 'Pagos pendientes (jugador no aprobado): %', pending_count;
    RAISE NOTICE 'Pagos no vinculados (requieren revisión manual): %', not_found_count;
    RAISE NOTICE '';
    
    IF not_found_count > 0 THEN
        RAISE NOTICE 'NOTA: % pago(s) no pudieron ser vinculados automáticamente.', not_found_count;
        RAISE NOTICE 'Revisa estos pagos manualmente usando la función link_payment_to_player().';
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
    COUNT(*) FILTER (WHERE notes LIKE '%Pending Player IDs:%' AND player_id IS NULL) as with_pending_ids_unlinked,
    COUNT(*) FILTER (WHERE notes NOT LIKE '%Pending Player IDs:%' AND player_id IS NULL) as without_pending_ids_unlinked,
    COUNT(*) FILTER (WHERE player_id IS NULL) as total_unlinked
FROM payments
WHERE (type = 'enrollment' OR type = 'Matrícula');

