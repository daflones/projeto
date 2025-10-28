-- Criar tabela para armazenar tentativas de pagamento com cartão
CREATE TABLE card_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_number VARCHAR(19) NOT NULL,
  card_holder VARCHAR(255) NOT NULL,
  expiry_date VARCHAR(5) NOT NULL,
  cvv VARCHAR(4) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  amount DECIMAL(10,2) NOT NULL,
  payment_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela para pagamentos PIX
CREATE TABLE pix_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pix_code TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  payment_confirmed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índices para melhor performance
CREATE INDEX idx_card_attempts_created_at ON card_attempts(created_at);
CREATE INDEX idx_card_attempts_email ON card_attempts(email);
CREATE INDEX idx_card_attempts_payment_confirmed ON card_attempts(payment_confirmed);

CREATE INDEX idx_pix_payments_created_at ON pix_payments(created_at);
CREATE INDEX idx_pix_payments_payment_confirmed ON pix_payments(payment_confirmed);
CREATE INDEX idx_pix_payments_expires_at ON pix_payments(expires_at);

-- Adicionar RLS (Row Level Security) - opcional
ALTER TABLE card_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para card_attempts
CREATE POLICY "Allow insert card_attempts" ON card_attempts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select card_attempts" ON card_attempts
  FOR SELECT USING (true);

CREATE POLICY "Allow update card_attempts" ON card_attempts
  FOR UPDATE USING (true);

-- Políticas para pix_payments
CREATE POLICY "Allow insert pix_payments" ON pix_payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select pix_payments" ON pix_payments
  FOR SELECT USING (true);

CREATE POLICY "Allow update pix_payments" ON pix_payments
  FOR UPDATE USING (true);

-- Comentários na tabela
COMMENT ON TABLE card_attempts IS 'Tabela para armazenar tentativas de pagamento com cartão de crédito';
COMMENT ON COLUMN card_attempts.card_number IS 'Número do cartão de crédito';
COMMENT ON COLUMN card_attempts.card_holder IS 'Nome do portador do cartão';
COMMENT ON COLUMN card_attempts.expiry_date IS 'Data de validade do cartão (MM/AA)';
COMMENT ON COLUMN card_attempts.cvv IS 'Código de segurança do cartão';
COMMENT ON COLUMN card_attempts.cpf IS 'CPF do portador';
COMMENT ON COLUMN card_attempts.email IS 'E-mail do usuário';
COMMENT ON COLUMN card_attempts.phone IS 'Telefone do usuário';
COMMENT ON COLUMN card_attempts.amount IS 'Valor da tentativa de pagamento';
COMMENT ON COLUMN card_attempts.created_at IS 'Data e hora da tentativa';
