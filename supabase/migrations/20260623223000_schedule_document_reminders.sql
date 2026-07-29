-- Agendamento automatico da cobranca de declaracao escolar vencida.
-- A chave de autorizacao nao fica versionada; ela deve existir no Vault como:
--   document_reminder_cron_secret

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'process-expired-school-document-reminders'
  ) THEN
    PERFORM cron.unschedule('process-expired-school-document-reminders');
  END IF;
END $$;

SELECT cron.schedule(
  'process-expired-school-document-reminders',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://phxffszwcpmwxbsaqzlm.supabase.co/functions/v1/process-expired-document-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'document_reminder_cron_secret'
        ORDER BY updated_at DESC
        LIMIT 1
      )
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'scope', 'comprovante_escolaridade'
    )
  ) AS request_id;
  $$
);
