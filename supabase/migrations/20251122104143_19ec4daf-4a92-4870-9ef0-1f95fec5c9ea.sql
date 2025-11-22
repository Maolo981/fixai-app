-- Tabella dati fiscali per fatturazione
CREATE TABLE IF NOT EXISTS billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  company_name TEXT,
  vat_number TEXT,
  tax_code TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'IT',
  sdi_code TEXT,
  pec_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella carte di pagamento salvate (tokenizzate)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  card_brand TEXT NOT NULL,
  card_last4 TEXT NOT NULL,
  exp_month INTEGER NOT NULL,
  exp_year INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella transazioni pagamento
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'balance', 'full')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  payment_method_id UUID REFERENCES payment_methods,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tabella rimborsi
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments NOT NULL,
  job_id UUID REFERENCES jobs NOT NULL,
  stripe_refund_id TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  refund_type TEXT NOT NULL CHECK (refund_type IN ('full', 'partial', 'cancellation_24h', 'cancellation_48h', 'cancellation_72h')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tabella fatture
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  vat_amount NUMERIC(10,2) NOT NULL,
  pdf_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'sent', 'paid')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurazioni sistema pagamento
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_percentage INTEGER DEFAULT 30,
  refund_24h_percentage INTEGER DEFAULT 0,
  refund_48h_percentage INTEGER DEFAULT 50,
  refund_72h_percentage INTEGER DEFAULT 100,
  vat_rate NUMERIC(4,2) DEFAULT 22.00,
  invoice_prefix TEXT DEFAULT 'INV',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserisci configurazione default
INSERT INTO payment_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Indici per performance
CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_job_id ON refunds(job_id);
CREATE INDEX idx_invoices_job_id ON invoices(job_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);

-- RLS Policies
ALTER TABLE billing_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Billing info policies
CREATE POLICY "Users can view own billing info"
  ON billing_info FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own billing info"
  ON billing_info FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own billing info"
  ON billing_info FOR UPDATE
  USING (auth.uid() = user_id);

-- Payment methods policies
CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert payments"
  ON payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update payments"
  ON payments FOR UPDATE
  USING (true);

-- Refunds policies
CREATE POLICY "Users can view own refunds"
  ON refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments 
      WHERE payments.id = refunds.payment_id 
      AND payments.user_id = auth.uid()
    )
  );

-- Invoices policies
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

-- Payment settings policies (read-only for all)
CREATE POLICY "Everyone can view payment settings"
  ON payment_settings FOR SELECT
  USING (true);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_billing_info_updated_at
  BEFORE UPDATE ON billing_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Funzione per generare numero fattura progressivo
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year TEXT;
  count INTEGER;
  prefix TEXT;
BEGIN
  year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT invoice_prefix INTO prefix FROM payment_settings LIMIT 1;
  
  SELECT COUNT(*) + 1 INTO count
  FROM invoices
  WHERE EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM NOW());
  
  RETURN prefix || '/' || year || '/' || LPAD(count::TEXT, 4, '0');
END;
$$;

-- Estendi stati payment_status in jobs
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_payment_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_payment_status_check 
  CHECK (payment_status IN (
    'pending', 
    'deposit_pending', 
    'deposit_paid', 
    'balance_pending', 
    'paid', 
    'refunded', 
    'partially_refunded', 
    'failed'
  ));