-- ============================================
-- SQL para rastrear análises de WhatsApp
-- ============================================

-- 1. Criar tabela de análises com histórico
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp VARCHAR(20) NOT NULL,
  messages_count INT DEFAULT 0,
  media_count INT DEFAULT 0,
  contacts_count INT DEFAULT 1,
  risk_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
  analysis_number INT DEFAULT 1, -- Número sequencial de análises para este WhatsApp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(whatsapp, analysis_number) -- Garante que cada WhatsApp tem um número único por análise
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_analysis_whatsapp ON analysis_results(whatsapp);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_whatsapp_number ON analysis_results(whatsapp, analysis_number DESC);

-- 3. Criar tabela de histórico de análises (para manter registro de todas)
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp VARCHAR(20) NOT NULL,
  messages_count INT,
  media_count INT,
  contacts_count INT,
  risk_level VARCHAR(20),
  analysis_number INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Criar índices para histórico
CREATE INDEX IF NOT EXISTS idx_history_whatsapp ON analysis_history(whatsapp);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON analysis_history(created_at DESC);

-- 5. Função para obter ou criar registro de análise
CREATE OR REPLACE FUNCTION get_or_create_analysis(
  p_whatsapp VARCHAR(20)
)
RETURNS TABLE (
  id UUID,
  whatsapp VARCHAR(20),
  messages_count INT,
  media_count INT,
  contacts_count INT,
  risk_level VARCHAR(20),
  analysis_number INT
) AS $$
BEGIN
  -- Tentar obter o registro existente
  RETURN QUERY
  SELECT 
    ar.id,
    ar.whatsapp,
    ar.messages_count,
    ar.media_count,
    ar.contacts_count,
    ar.risk_level,
    ar.analysis_number
  FROM analysis_results ar
  WHERE ar.whatsapp = p_whatsapp
  ORDER BY ar.analysis_number DESC
  LIMIT 1;
  
  -- Se não encontrou, criar novo registro
  IF NOT FOUND THEN
    INSERT INTO analysis_results (whatsapp, analysis_number)
    VALUES (p_whatsapp, 1)
    RETURNING 
      analysis_results.id,
      analysis_results.whatsapp,
      analysis_results.messages_count,
      analysis_results.media_count,
      analysis_results.contacts_count,
      analysis_results.risk_level,
      analysis_results.analysis_number
    INTO id, whatsapp, messages_count, media_count, contacts_count, risk_level, analysis_number;
    
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Função para salvar resultados de análise
CREATE OR REPLACE FUNCTION save_analysis_results(
  p_whatsapp VARCHAR(20),
  p_messages_count INT,
  p_media_count INT,
  p_contacts_count INT,
  p_risk_level VARCHAR(20)
)
RETURNS TABLE (
  id UUID,
  whatsapp VARCHAR(20),
  messages_count INT,
  media_count INT,
  contacts_count INT,
  risk_level VARCHAR(20),
  analysis_number INT
) AS $$
DECLARE
  v_analysis_number INT;
  v_id UUID;
BEGIN
  -- Obter o número da próxima análise
  SELECT COALESCE(MAX(analysis_number), 0) + 1 INTO v_analysis_number
  FROM analysis_results
  WHERE whatsapp = p_whatsapp;
  
  -- Inserir novo registro de análise
  INSERT INTO analysis_results (
    whatsapp,
    messages_count,
    media_count,
    contacts_count,
    risk_level,
    analysis_number
  )
  VALUES (
    p_whatsapp,
    p_messages_count,
    p_media_count,
    p_contacts_count,
    p_risk_level,
    v_analysis_number
  )
  RETURNING analysis_results.id INTO v_id;
  
  -- Registrar no histórico
  INSERT INTO analysis_history (
    whatsapp,
    messages_count,
    media_count,
    contacts_count,
    risk_level,
    analysis_number
  )
  VALUES (
    p_whatsapp,
    p_messages_count,
    p_media_count,
    p_contacts_count,
    p_risk_level,
    v_analysis_number
  );
  
  -- Retornar os dados salvos
  RETURN QUERY
  SELECT 
    ar.id,
    ar.whatsapp,
    ar.messages_count,
    ar.media_count,
    ar.contacts_count,
    ar.risk_level,
    ar.analysis_number
  FROM analysis_results ar
  WHERE ar.id = v_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Função para obter estatísticas de um WhatsApp
CREATE OR REPLACE FUNCTION get_analysis_stats(
  p_whatsapp VARCHAR(20)
)
RETURNS TABLE (
  total_analyses INT,
  latest_analysis_number INT,
  total_messages INT,
  total_media INT,
  total_contacts INT,
  latest_risk_level VARCHAR(20),
  last_analysis_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT as total_analyses,
    MAX(analysis_number)::INT as latest_analysis_number,
    SUM(messages_count)::INT as total_messages,
    SUM(media_count)::INT as total_media,
    SUM(contacts_count)::INT as total_contacts,
    (SELECT risk_level FROM analysis_results WHERE whatsapp = p_whatsapp ORDER BY analysis_number DESC LIMIT 1)::VARCHAR(20) as latest_risk_level,
    MAX(created_at) as last_analysis_date
  FROM analysis_results
  WHERE whatsapp = p_whatsapp;
END;
$$ LANGUAGE plpgsql;

-- 8. Habilitar RLS
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

-- 9. Políticas de segurança para analysis_results
CREATE POLICY "Permitir inserção de análises" ON analysis_results
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir leitura de análises" ON analysis_results
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir atualização de análises" ON analysis_results
  FOR UPDATE
  USING (true);

-- 10. Políticas de segurança para analysis_history
CREATE POLICY "Permitir inserção no histórico" ON analysis_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir leitura do histórico" ON analysis_history
  FOR SELECT
  USING (true);

-- 11. Comentários para documentação
COMMENT ON TABLE analysis_results IS 'Armazena os resultados mais recentes de análises por WhatsApp';
COMMENT ON TABLE analysis_history IS 'Histórico completo de todas as análises realizadas';
COMMENT ON COLUMN analysis_results.analysis_number IS 'Número sequencial da análise (1ª, 2ª, 3ª análise, etc)';
COMMENT ON COLUMN analysis_results.messages_count IS 'Quantidade de mensagens suspeitas encontradas';
COMMENT ON COLUMN analysis_results.media_count IS 'Quantidade de mídias comprometedoras encontradas';
COMMENT ON COLUMN analysis_results.contacts_count IS 'Quantidade de contatos suspeitos encontrados';
COMMENT ON FUNCTION get_or_create_analysis(VARCHAR) IS 'Obtém ou cria um registro de análise para um WhatsApp';
COMMENT ON FUNCTION save_analysis_results(VARCHAR, INT, INT, INT, VARCHAR) IS 'Salva os resultados de uma nova análise';
COMMENT ON FUNCTION get_analysis_stats(VARCHAR) IS 'Obtém estatísticas completas de um WhatsApp';

-- ============================================
-- Fim do Script
-- ============================================
