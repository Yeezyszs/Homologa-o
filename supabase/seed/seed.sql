-- =============================================================
-- Seed — catálogo inicial (dados reais da Sumaré).
-- Fonte: FOR-POP 7 2.0 — Controle de documentos.
-- Ponto de partida editável; a empresa refina depois.
-- Re-executável: só popula tabelas ainda vazias.
-- =============================================================

do $$
begin

-- ---- Tipos de documento --------------------------------------
if (select count(*) from tipos_documento) = 0 then
  insert into tipos_documento (nome, tem_validade, origem) values
    ('Alvará de funcionamento', true,  'fornecedor'),
    ('Licença sanitária', true,  'fornecedor'),
    ('Licença ambiental / de operação', true,  'fornecedor'),
    ('AVCB / Certificado do Corpo de Bombeiros', true,  'fornecedor'),
    ('Responsável técnico (CRQ/CRBio)', false, 'fornecedor'),
    ('Ficha técnica do produto/serviço', false, 'fornecedor'),
    ('FISPQ / Ficha de segurança (FDS)', false, 'fornecedor'),
    ('Declaração food grade / NSF', false, 'fornecedor'),
    ('Plano/relatórios ou certificado de controle de pragas', true,  'fornecedor'),
    ('Acreditação ISO/IEC 17025 + escopo', true,  'fornecedor'),
    ('Certificações vigentes (ISO/FSSC/BPF/NSF)', true,  'fornecedor'),
    ('Laudo de análise / relatório técnico', true,  'fornecedor'),
    ('Laudo de migração (embalagens)', true,  'fornecedor'),
    ('Certificado de calibração RBC/Inmetro', true,  'fornecedor'),
    ('Certificado de material (inox/plástico)', false, 'fornecedor'),
    ('Declaração de ausência de OGM, alérgenos e radiação', false, 'fornecedor'),
    ('Declaração de atendimento à legislação (RDC/IN/MAPA/ANVISA)', false, 'fornecedor'),
    ('Proposta comercial', false, 'fornecedor'),
    ('Questionário de avaliação (FOR POP07 1.5)', false, 'interno'),
    ('Carta de Garantia do Fornecedor (FOR-POP 7 2.2)', false, 'interno'),
    ('Carta compromisso com produtor rural (FOR POP 7 1.9)', false, 'interno'),
    ('Checklist de Boas Práticas Agrícolas (FOR POP 7 1.8)', false, 'interno'),
    ('Questionário de Avaliação de Produtores (FOR POP07 1.1)', false, 'interno'),
    ('Diploma de formação (responsável técnico)', false, 'fornecedor'),
    ('Currículo do nutricionista responsável', false, 'fornecedor'),
    ('Licença específica para preparo/transporte de alimentos', true,  'fornecedor'),
    ('Termo de Compromisso (transportadora)', false, 'interno'),
    ('Declaração da Transportadora', false, 'fornecedor'),
    ('Certificado de regularidade IBAMA', true,  'fornecedor'),
    ('ATTIPP — Transporte de produtos perigosos', true,  'fornecedor'),
    ('ART — Anotação de Responsabilidade Técnica', true,  'fornecedor'),
    ('Certificado de destinação de resíduos', true,  'fornecedor'),
    ('MTR — Manifesto de Transporte de Resíduos', true,  'fornecedor');
end if;

-- ---- Segmentos (atividades) ----------------------------------
if (select count(*) from segmentos) = 0 then
  insert into segmentos (nome, categoria) values
    -- Serviços
    ('Laboratório de análises', 'servico'),
    ('Controle de pragas', 'servico'),
    ('Serviços ambientais', 'servico'),
    ('Limpeza de caixa d''água', 'servico'),
    ('Consultoria em segurança de alimentos', 'servico'),
    ('Refeição coletiva', 'servico'),
    ('Higienização e manutenção de big bags', 'servico'),
    ('Coleta e destinação de resíduos', 'servico'),
    ('Calibração', 'servico'),
    -- Produtos
    ('Matéria-prima/produtor rural', 'produto'),
    ('Produto químico para caldeira', 'produto'),
    ('Produto químico para tratamento de água potável', 'produto'),
    ('Produto químico para higienização de equipamentos', 'produto'),
    ('Lubrificantes/óleo/graxa', 'produto'),
    ('Embalagens primárias (bag e sacaria)', 'produto'),
    ('Filme stretch/sacos plásticos', 'produto'),
    ('EPIs', 'produto'),
    -- Equipamentos
    ('Equipamentos', 'equipamento'),
    ('Material de manutenção (peças)', 'equipamento'),
    -- Transporte
    ('Transportadora', 'transporte');
end if;

-- ---- Checklists de exemplo (segmento_documentos) -------------
if (select count(*) from segmento_documentos) = 0 then
  insert into segmento_documentos (segmento_id, tipo_documento_id, exigencia)
  select s.id, t.id, v.exigencia
  from (values
    -- Calibração
    ('Calibração', 'Alvará de funcionamento', 'obrigatorio'),
    ('Calibração', 'Licença ambiental / de operação', 'obrigatorio'),
    ('Calibração', 'Acreditação ISO/IEC 17025 + escopo', 'obrigatorio'),
    ('Calibração', 'AVCB / Certificado do Corpo de Bombeiros', 'obrigatorio'),
    ('Calibração', 'Certificado de calibração RBC/Inmetro', 'condicional'),
    ('Calibração', 'Certificações vigentes (ISO/FSSC/BPF/NSF)', 'condicional'),
    -- Controle de pragas
    ('Controle de pragas', 'Alvará de funcionamento', 'obrigatorio'),
    ('Controle de pragas', 'Licença sanitária', 'obrigatorio'),
    ('Controle de pragas', 'Licença ambiental / de operação', 'obrigatorio'),
    ('Controle de pragas', 'Ficha técnica do produto/serviço', 'obrigatorio'),
    ('Controle de pragas', 'Declaração de ausência de OGM, alérgenos e radiação', 'obrigatorio'),
    ('Controle de pragas', 'Laudo de análise / relatório técnico', 'obrigatorio'),
    ('Controle de pragas', 'Questionário de avaliação (FOR POP07 1.5)', 'obrigatorio'),
    ('Controle de pragas', 'Declaração de atendimento à legislação (RDC/IN/MAPA/ANVISA)', 'obrigatorio'),
    ('Controle de pragas', 'AVCB / Certificado do Corpo de Bombeiros', 'obrigatorio'),
    ('Controle de pragas', 'Certificações vigentes (ISO/FSSC/BPF/NSF)', 'condicional'),
    -- Transportadora
    ('Transportadora', 'Alvará de funcionamento', 'obrigatorio'),
    ('Transportadora', 'Licença sanitária', 'obrigatorio'),
    ('Transportadora', 'AVCB / Certificado do Corpo de Bombeiros', 'obrigatorio'),
    ('Transportadora', 'Termo de Compromisso (transportadora)', 'obrigatorio'),
    ('Transportadora', 'Declaração da Transportadora', 'obrigatorio'),
    -- Matéria-prima/produtor rural
    ('Matéria-prima/produtor rural', 'Carta compromisso com produtor rural (FOR POP 7 1.9)', 'obrigatorio'),
    ('Matéria-prima/produtor rural', 'Checklist de Boas Práticas Agrícolas (FOR POP 7 1.8)', 'obrigatorio'),
    ('Matéria-prima/produtor rural', 'Questionário de Avaliação de Produtores (FOR POP07 1.1)', 'obrigatorio')
  ) as v(segmento, tipo, exigencia)
  join segmentos s        on s.nome = v.segmento
  join tipos_documento t  on t.nome = v.tipo;
end if;

end $$;
