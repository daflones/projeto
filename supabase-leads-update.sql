-- ============================================
-- SQL para adicionar captura de WhatsApp e Nome
-- ============================================

-- 1. Criar tabela de leads (captura inicial da landing page)
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp VARCHAR(20) NOT NULL,
  nome VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  origin_page VARCHAR(50) DEFAULT 'landing'
);

-- 2. Adicionar índice para buscar por WhatsApp
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- 3. Adicionar colunas nas tabelas de pagamento (se ainda não existirem)
ALTER TABLE card_attempts 
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20),
ADD COLUMN IF NOT EXISTS nome VARCHAR(100);

ALTER TABLE pix_payments 
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20),
ADD COLUMN IF NOT EXISTS nome VARCHAR(100);

-- 4. Criar função para atualizar lead com nome
CREATE OR REPLACE FUNCTION update_lead_name(
  p_whatsapp VARCHAR(20),
  p_nome VARCHAR(100)
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE leads
  SET nome = p_nome
  WHERE id = (
    SELECT id
    FROM leads
    WHERE whatsapp = p_whatsapp
      AND nome IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$;

-- 5. Habilitar RLS (Row Level Security) - Política permissiva para teste
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção (anônimo pode inserir)
CREATE POLICY "Permitir inserção de leads" ON leads
  FOR INSERT
  WITH CHECK (true);

-- Política para permitir leitura (anônimo pode ler)
CREATE POLICY "Permitir leitura de leads" ON leads
  FOR SELECT
  USING (true);

-- Política para permitir atualização (anônimo pode atualizar)
CREATE POLICY "Permitir atualização de leads" ON leads
  FOR UPDATE
  USING (true);

-- 6. Comentários nas tabelas para documentação
COMMENT ON TABLE leads IS 'Captura de leads da landing page com WhatsApp e nome';
COMMENT ON COLUMN leads.whatsapp IS 'Número do WhatsApp fornecido na landing page';
COMMENT ON COLUMN leads.nome IS 'Nome fornecido na página de análise';
COMMENT ON COLUMN leads.ip_address IS 'IP do visitante (opcional)';
COMMENT ON COLUMN leads.user_agent IS 'User agent do navegador (opcional)';

-- ============================================
-- Fim do Script
-- ============================================
