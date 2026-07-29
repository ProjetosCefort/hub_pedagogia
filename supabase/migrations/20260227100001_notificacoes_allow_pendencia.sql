-- Allow related_entity_type = 'pendencia' (used by refresh_pendencia_notifications_for_jovem).

ALTER TABLE public.notificacoes_internas
  DROP CONSTRAINT IF EXISTS notificacoes_internas_related_entity_type_check;

ALTER TABLE public.notificacoes_internas
  ADD CONSTRAINT notificacoes_internas_related_entity_type_check
  CHECK (
    related_entity_type IS NULL
    OR related_entity_type = ANY (ARRAY[
      'intervencao','avaliacao','documento','status_change','tarefa','encaminhamento','pendencia'
    ])
  );
