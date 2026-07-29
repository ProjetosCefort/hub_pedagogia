ALTER TABLE public.documentos_jovem
  DROP CONSTRAINT IF EXISTS documentos_jovem_tipo_check;

ALTER TABLE public.documentos_jovem
  ADD CONSTRAINT documentos_jovem_tipo_check CHECK (
    tipo = ANY (
      ARRAY[
        'rg'::text,
        'cpf'::text,
        'comprovante_endereco'::text,
        'comprovante_escolaridade'::text,
        'carteira_trabalho'::text,
        'laudo_pcd'::text,
        'outros'::text
      ]
    )
  );

COMMENT ON COLUMN public.documentos_jovem.tipo IS
  'Tipo de documento (rg, cpf, comprovante_endereco, comprovante_escolaridade, carteira_trabalho, laudo_pcd, outros).';
