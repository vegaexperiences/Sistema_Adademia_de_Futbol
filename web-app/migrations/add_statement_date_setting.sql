-- Add settings for monthly statement payment date and auto-send feature
-- Default payment day is 1st of each month
-- Default auto-send is enabled (true)

-- Insert statement_payment_day setting (day of month when statements are generated)
INSERT INTO settings (key, value, description)
VALUES ('statement_payment_day', '1', 'Día del mes en que se generan los estados de cuenta (1-31)')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Insert auto_send_statements setting (enable/disable automatic statement sending)
INSERT INTO settings (key, value, description)
VALUES ('auto_send_statements', 'true', 'Habilitar envío automático de estados de cuenta (true/false)')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Verify the settings were created
SELECT key, value, description FROM settings WHERE key IN ('statement_payment_day', 'auto_send_statements');

