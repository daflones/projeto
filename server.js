import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const DBXBANKPAY_API_KEY = process.env.DBXBANKPAY_API_KEY;
const DBXBANKPAY_API_URL = process.env.DBXBANKPAY_API_URL || 'https://dbxbankpay.com/api/v1';
const DBXBANKPAY_WEBHOOK_SECRET = process.env.DBXBANKPAY_WEBHOOK_SECRET || '';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// ─── Supabase client (server-side) ─────────────────────────────────────────────
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️  Supabase credentials not found – webhook will not update DB');
}

// ─── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── POST /api/create-payment ──────────────────────────────────────────────────
// Frontend calls this to create a PIX payment via DBXBankPay.
// The API key never leaves the server.
app.post('/api/create-payment', async (req, res) => {
  try {
    if (!DBXBANKPAY_API_KEY || DBXBANKPAY_API_KEY === 'SUA_API_KEY_AQUI') {
      return res.status(500).json({ error: 'API key do DBXBankPay não configurada no servidor' });
    }

    const {
      amount,
      customer_name,
      customer_email,
      customer_document,
      customer_phone,
      external_reference,
      plan_id,
      plan_name,
      whatsapp,
      nome
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Determine the public webhook URL
    let webhookUrl;
    if (WEBHOOK_BASE_URL) {
      webhookUrl = `${WEBHOOK_BASE_URL}/api/webhook/dbxbankpay`;
    } else {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      webhookUrl = `${protocol}://${host}/api/webhook/dbxbankpay`;
    }

    // Generate a unique external reference if not provided
    const extRef = external_reference || `${(whatsapp || '').replace(/\D/g, '')}${Date.now()}`;

    // Call DBXBankPay API
    const apiUrl = `${DBXBANKPAY_API_URL}/deposits/create`;
    console.log('📤 Calling DBXBankPay:', apiUrl, '| webhook:', webhookUrl);

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DBXBANKPAY_API_KEY
      },
      body: JSON.stringify({
        amount: Number(amount),
        customer_email: customer_email || `${(whatsapp || 'user').replace(/\D/g, '')}@pix.local`,
        customer_name: customer_name || nome || 'Cliente',
        customer_document: customer_document || (whatsapp || '').replace(/\D/g, '').slice(-11) || '00000000000',
        customer_phone: customer_phone || (whatsapp || '').replace(/\D/g, '') || '',
        external_reference: extRef,
        webhook_url: webhookUrl
      })
    });

    // Read response as text first to handle non-JSON responses
    const responseText = await apiResponse.text();
    console.log(`📥 DBXBankPay response [${apiResponse.status}]:`, responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('❌ DBXBankPay returned non-JSON response:', responseText.substring(0, 300));
      return res.status(502).json({
        error: 'Gateway retornou resposta inválida. Verifique a URL da API.',
        status: apiResponse.status,
        hint: `URL usada: ${apiUrl}`
      });
    }

    if (!apiResponse.ok) {
      console.error('❌ DBXBankPay error:', data);
      return res.status(apiResponse.status).json({ error: 'Erro ao criar pagamento', details: data });
    }

    console.log('✅ Payment created:', { id: data.id, payment_id: data.payment_id, amount: data.amount, external_reference: extRef });

    // Save/update in Supabase pix_payments table
    if (supabase && whatsapp) {
      try {
        const normalizedWhatsapp = (whatsapp || '').replace(/\D/g, '');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Try to find lead's payment_id
        let leadPaymentId = null;
        const { data: leadData } = await supabase
          .from('leads')
          .select('payment_id')
          .eq('whatsapp', normalizedWhatsapp)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (leadData?.payment_id) {
          leadPaymentId = leadData.payment_id;
        }

        await supabase
          .from('pix_payments')
          .insert([{
            payment_id: leadPaymentId,
            pix_code: data.qr_code_text || data.pix_copia_cola || '',
            amount: Number(amount),
            whatsapp: normalizedWhatsapp,
            nome: nome || customer_name || 'Cliente',
            email: customer_email || '',
            phone: customer_phone || '',
            payment_confirmed: false,
            expires_at: expiresAt,
            gateway_transaction_id: data.id || null,
            gateway_payment_id: data.payment_id || null,
            external_reference: extRef
          }]);

        console.log('✅ pix_payments record created for', normalizedWhatsapp);
      } catch (dbError) {
        console.error('⚠️  Failed to save to pix_payments:', dbError.message);
      }
    }

    // Return relevant data to frontend
    return res.json({
      success: true,
      id: data.id,
      payment_id: data.payment_id,
      qr_code: data.qr_code,
      qr_code_text: data.qr_code_text || data.pix_copia_cola,
      pix_copia_cola: data.pix_copia_cola || data.qr_code_text,
      amount: data.amount,
      net_amount: data.net_amount,
      fee: data.fee,
      status: data.status,
      external_reference: extRef
    });
  } catch (error) {
    console.error('❌ create-payment error:', error);
    return res.status(500).json({ error: 'Erro interno ao criar pagamento' });
  }
});

// ─── POST /api/webhook/dbxbankpay ──────────────────────────────────────────────
// DBXBankPay sends payment notifications here.
app.post('/api/webhook/dbxbankpay', async (req, res) => {
  try {
    const payload = req.body;
    console.log('🔔 Webhook received:', JSON.stringify(payload, null, 2));

    // Verify HMAC signature if secret is configured
    if (DBXBANKPAY_WEBHOOK_SECRET) {
      const signature = req.headers['x-dbx-signature'];
      if (signature) {
        const payloadStr = JSON.stringify(payload);
        const expectedSignature = crypto
          .createHmac('sha256', DBXBANKPAY_WEBHOOK_SECRET)
          .update(payloadStr)
          .digest('hex');

        if (signature !== expectedSignature) {
          console.warn('⚠️  Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
        console.log('✅ Webhook signature verified');
      }
    }

    const event = payload.event;
    const data = payload.data || payload;

    if (event === 'payment.approved' && supabase) {
      const externalRef = data.external_reference || data.external_id;
      const transactionId = data.id;

      console.log(`✅ Payment approved: ${transactionId} - R$ ${data.amount} - ref: ${externalRef}`);

      // Update pix_payments by external_reference OR gateway_transaction_id
      let updated = false;

      if (externalRef) {
        const { data: updateData, error: updateError } = await supabase
          .from('pix_payments')
          .update({ payment_confirmed: true })
          .eq('external_reference', externalRef)
          .select('id, whatsapp');

        if (!updateError && updateData && updateData.length > 0) {
          updated = true;
          console.log(`✅ pix_payments updated by external_reference: ${externalRef}`, updateData);
        }
      }

      if (!updated && transactionId) {
        const { data: updateData, error: updateError } = await supabase
          .from('pix_payments')
          .update({ payment_confirmed: true })
          .eq('gateway_transaction_id', transactionId)
          .select('id, whatsapp');

        if (!updateError && updateData && updateData.length > 0) {
          updated = true;
          console.log(`✅ pix_payments updated by gateway_transaction_id: ${transactionId}`, updateData);
        }
      }

      if (!updated) {
        console.warn(`⚠️  Could not find pix_payment for ref=${externalRef} or txn=${transactionId}`);
      }
    } else if (event === 'payment.approved') {
      console.warn('⚠️  Payment approved but Supabase not available');
    } else {
      console.log(`ℹ️  Webhook event: ${event} (no action taken)`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ status: 'received' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Still return 200 to prevent retries
    return res.status(200).json({ status: 'received', error: error.message });
  }
});

// ─── POST /api/check-payment ───────────────────────────────────────────────────
// Frontend can also check payment status via this endpoint
app.post('/api/check-payment', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase não disponível' });
    }

    const { external_reference, whatsapp } = req.body;

    let query = supabase
      .from('pix_payments')
      .select('id, payment_confirmed, expires_at, gateway_transaction_id, external_reference');

    if (external_reference) {
      query = query.eq('external_reference', external_reference);
    } else if (whatsapp) {
      query = query
        .eq('whatsapp', whatsapp.replace(/\D/g, ''))
        .order('created_at', { ascending: false })
        .limit(1);
    } else {
      return res.status(400).json({ error: 'external_reference ou whatsapp necessário' });
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const record = Array.isArray(data) ? data[0] : data;
    return res.json({
      success: true,
      payment_confirmed: record?.payment_confirmed || false,
      id: record?.id
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
});

// ─── Servir arquivos estáticos da pasta dist ───────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - todas as rotas retornam index.html
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/health`);
  const publicWebhook = WEBHOOK_BASE_URL
    ? `${WEBHOOK_BASE_URL}/api/webhook/dbxbankpay`
    : `http://localhost:${PORT}/api/webhook/dbxbankpay`;
  console.log(`   Webhook: ${publicWebhook}`);
  if (!DBXBANKPAY_API_KEY || DBXBANKPAY_API_KEY === 'SUA_API_KEY_AQUI') {
    console.warn('⚠️  DBXBANKPAY_API_KEY not configured! Payments will not work.');
  }
});
