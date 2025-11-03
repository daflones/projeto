-- ============================================
-- SQL para inserção direta em analysis_results
-- (Alternativa se a função RPC não funcionar)
-- ============================================

-- Teste: Inserir um registro diretamente
INSERT INTO analysis_results (
  whatsapp,
  messages_count,
  media_count,
  contacts_count,
  risk_level,
  analysis_number
)
VALUES (
  '11999998888',
  16,
  4,
  1,
  'high',
  1
)
ON CONFLICT (whatsapp, analysis_number) DO UPDATE SET
  messages_count = EXCLUDED.messages_count,
  media_count = EXCLUDED.media_count,
  contacts_count = EXCLUDED.contacts_count,
  risk_level = EXCLUDED.risk_level,
  updated_at = NOW();

-- Verificar se foi inserido
SELECT * FROM analysis_results WHERE whatsapp = '11999998888';

-- Ver histórico
SELECT * FROM analysis_history WHERE whatsapp = '11999998888';
