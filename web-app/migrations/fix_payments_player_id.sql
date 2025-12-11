-- Migration: Fix payments with player_id = null by linking them to approved players
-- This script finds enrollment payments with player_id = null and links them to players
-- based on the pending_player_ids stored in the notes field

-- Step 1: Create a temporary function to extract pending_player_id from notes
-- The notes format is: "Matrícula para X jugador(es). Tutor: Y. Pending Player IDs: uuid1, uuid2, ..."

-- Helper function to extract UUIDs from text
CREATE OR REPLACE FUNCTION extract_uuids_from_text(text_content TEXT)
RETURNS UUID[] AS $$
DECLARE
    uuid_pattern TEXT := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
    uuid_matches TEXT[];
    uuid_array UUID[] := ARRAY[]::UUID[];
    uuid_text TEXT;
BEGIN
    -- Extract all UUIDs from the text using regex
    SELECT array_agg(match[1]::UUID)
    INTO uuid_array
    FROM regexp_matches(text_content, uuid_pattern, 'gi') AS match;
    
    RETURN COALESCE(uuid_array, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;

-- Disable trigger temporarily to avoid updated_at errors (if it exists)
DO $$
BEGIN
    -- Check if trigger exists and disable it
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
    updated_count INTEGER := 0;
    not_found_count INTEGER := 0;
    linked_count INTEGER := 0;
BEGIN
    RAISE NOTICE '--- Iniciando migración de pagos con player_id = null ---';
    
    -- Step 2: Find all payments with player_id = null and type = 'enrollment' or 'Matrícula'
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
        ORDER BY payment_date DESC
    LOOP
        -- Step 3: Extract pending_player_ids from notes
        -- Look for pattern: "Pending Player IDs: uuid1, uuid2, ..."
        IF payment_record.notes LIKE '%Pending Player IDs:%' THEN
            -- Extract UUIDs from notes
            pending_uuids := extract_uuids_from_text(payment_record.notes);
            
            IF array_length(pending_uuids, 1) > 0 THEN
                -- Try to find a player that matches one of the pending_player_ids
                -- Check if any of the UUIDs exist in the players table
                SELECT id INTO player_uuid
                FROM players
                WHERE id = ANY(pending_uuids)
                LIMIT 1;
                
                IF player_uuid IS NOT NULL THEN
                    -- Found a matching player! Update the payment
                    UPDATE payments
                    SET 
                        player_id = player_uuid,
                        status = CASE 
                            WHEN status = 'Pending' THEN 'Approved'
                            WHEN status IS NULL THEN 'Approved'
                            ELSE status
                        END
                    WHERE id = payment_record.id;
                    
                    updated_count := updated_count + 1;
                    linked_count := linked_count + 1;
                    
                    RAISE NOTICE '✅ Pago vinculado: Payment ID=%, Player ID=%, Amount=%, Status actualizado=%', 
                        payment_record.id, player_uuid, payment_record.amount,
                        CASE 
                            WHEN payment_record.status = 'Pending' THEN 'Approved'
                            WHEN payment_record.status IS NULL THEN 'Approved'
                            ELSE payment_record.status
                        END;
                ELSE
                    -- No matching player found - might not be approved yet
                    -- Check if any of the UUIDs exist in pending_players
                    DECLARE
                        pending_player_exists BOOLEAN;
                    BEGIN
                        SELECT EXISTS(
                            SELECT 1 FROM pending_players WHERE id = ANY(pending_uuids)
                        ) INTO pending_player_exists;
                        
                        IF pending_player_exists THEN
                            RAISE NOTICE '⚠️  Pago pendiente (jugador aún no aprobado): Payment ID=%, Pending IDs=%, Amount=%', 
                                payment_record.id, array_to_string(pending_uuids, ', '), payment_record.amount;
                        ELSE
                            RAISE NOTICE '❌ Pago sin jugador encontrado: Payment ID=%, Pending IDs=%, Amount=% (Los UUIDs no existen en players ni pending_players)', 
                                payment_record.id, array_to_string(pending_uuids, ', '), payment_record.amount;
                        END IF;
                    END;
                    
                    not_found_count := not_found_count + 1;
                END IF;
            ELSE
                -- Could not extract UUIDs from notes
                not_found_count := not_found_count + 1;
                RAISE NOTICE '⚠️  No se pudieron extraer UUIDs: Payment ID=%, Notes=%', 
                    payment_record.id, LEFT(payment_record.notes, 100);
            END IF;
        ELSE
            -- If notes don't contain "Pending Player IDs", this might be an old payment
            -- or a payment that was created differently
            not_found_count := not_found_count + 1;
            RAISE NOTICE '⚠️  Pago sin formato esperado: Payment ID=%, Notes=%', 
                payment_record.id, LEFT(payment_record.notes, 100);
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '--- Resumen de migración ---';
    RAISE NOTICE 'Pagos vinculados automáticamente: %', linked_count;
    RAISE NOTICE 'Pagos actualizados: %', updated_count;
    RAISE NOTICE 'Pagos no encontrados (requieren revisión manual): %', not_found_count;
    RAISE NOTICE '--- Migración completada ---';
    RAISE NOTICE '';
    IF not_found_count > 0 THEN
        RAISE NOTICE 'NOTA: % pago(s) no pudieron ser vinculados automáticamente.', not_found_count;
        RAISE NOTICE 'Estos pagos pueden requerir vinculación manual usando la función link_payment_to_player().';
    END IF;
END $$;

-- Re-enable trigger (if it exists)
DO $$
BEGIN
    -- Check if trigger exists and enable it
    IF EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_payments_updated_at' 
        AND tgrelid = 'payments'::regclass
    ) THEN
        ALTER TABLE payments ENABLE TRIGGER update_payments_updated_at;
    END IF;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS extract_uuids_from_text(TEXT);

-- Step 4: Create a helper view to identify payments that need manual linking
CREATE OR REPLACE VIEW payments_needing_player_link AS
SELECT 
    p.id as payment_id,
    p.amount,
    p.type,
    p.method,
    p.status,
    p.payment_date,
    p.notes,
    CASE 
        WHEN p.notes LIKE '%Pending Player IDs:%' THEN 'Tiene Pending Player IDs en notes'
        ELSE 'No tiene formato esperado'
    END as link_status
FROM payments p
WHERE p.player_id IS NULL
AND (p.type = 'enrollment' OR p.type = 'Matrícula')
ORDER BY p.payment_date DESC;

-- Step 5: Create a function to help link a payment to a player manually
CREATE OR REPLACE FUNCTION link_payment_to_player(
    payment_uuid UUID,
    player_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
    payment_exists BOOLEAN;
    player_exists BOOLEAN;
BEGIN
    -- Check if payment exists and has null player_id
    SELECT EXISTS(SELECT 1 FROM payments WHERE id = payment_uuid AND player_id IS NULL)
    INTO payment_exists;
    
    IF NOT payment_exists THEN
        RAISE EXCEPTION 'Payment % does not exist or already has a player_id', payment_uuid;
    END IF;
    
    -- Check if player exists
    SELECT EXISTS(SELECT 1 FROM players WHERE id = player_uuid)
    INTO player_exists;
    
    IF NOT player_exists THEN
        RAISE EXCEPTION 'Player % does not exist', player_uuid;
    END IF;
    
    -- Update the payment
    UPDATE payments
    SET 
        player_id = player_uuid,
        status = 'Approved'
    WHERE id = payment_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Display summary of payments that need linking
SELECT 
    COUNT(*) as total_payments_needing_link,
    SUM(CASE WHEN notes LIKE '%Pending Player IDs:%' THEN 1 ELSE 0 END) as with_pending_ids,
    SUM(CASE WHEN notes NOT LIKE '%Pending Player IDs:%' THEN 1 ELSE 0 END) as without_pending_ids
FROM payments
WHERE player_id IS NULL
AND (type = 'enrollment' OR type = 'Matrícula');

