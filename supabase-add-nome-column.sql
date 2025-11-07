-- ============================================
-- SQL para adicionar coluna 'nome' nas tabelas de análise
-- ============================================

-- Adicionar coluna 'nome' na tabela analysis_results
ALTER TABLE analysis_results 
ADD COLUMN IF NOT EXISTS nome VARCHAR(100) DEFAULT 'Usuário';

-- Adicionar coluna 'nome' na tabela analysis_history
ALTER TABLE analysis_history 
ADD COLUMN IF NOT EXISTS nome VARCHAR(100) DEFAULT 'Usuário';

-- Comentários para documentação
COMMENT ON COLUMN analysis_results.nome IS 'Nome do usuário analisado (obtido do Evolution API ou "Usuário" como padrão)';
COMMENT ON COLUMN analysis_history.nome IS 'Nome do usuário analisado no momento da análise';

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name IN ('analysis_results', 'analysis_history') 
  AND column_name = 'nome';
