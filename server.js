import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
 import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const PAYFAST4_CLIENT_ID = process.env.PAYFAST4_CLIENT_ID || '';
const PAYFAST4_CLIENT_SECRET = process.env.PAYFAST4_CLIENT_SECRET || '';
const PAYFAST4_API_URL = process.env.PAYFAST4_API_URL || 'https://payfast4.com/api';
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

// ─── PayFast4 OAuth Token Management ────────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

async function getPayFast4Token() {
  // Return cached token if still valid (with 60s margin)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${PAYFAST4_CLIENT_ID}:${PAYFAST4_CLIENT_SECRET}`).toString('base64');

  console.log('🔑 Requesting PayFast4 OAuth token...');
  const response = await fetch(`${PAYFAST4_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    }
  });

  const responseText = await response.text();
  console.log(`🔑 Token response [${response.status}]:`, responseText.substring(0, 300));

  if (!response.ok) {
    throw new Error(`Failed to get PayFast4 token: ${response.status} - ${responseText.substring(0, 200)}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`PayFast4 token response is not JSON: ${responseText.substring(0, 200)}`);
  }

  cachedToken = data.access_token || data.token;
  // Default expiry: 1 hour if not provided
  const expiresIn = data.expires_in || 3600;
  tokenExpiresAt = Date.now() + expiresIn * 1000;

  console.log('✅ PayFast4 token obtained, expires in', expiresIn, 'seconds');
  return cachedToken;
}

// ─── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', gateway: 'payfast4', timestamp: new Date().toISOString() });
});

// ─── POST /api/create-payment ──────────────────────────────────────────────────
// Frontend calls this to create a PIX payment via PayFast4.
app.post('/api/create-payment', async (req, res) => {
  try {
    if (!PAYFAST4_CLIENT_ID || !PAYFAST4_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Credenciais PayFast4 não configuradas no servidor' });
    }

    const {
      amount,
      customer_name,
      customer_email,
      customer_document,
      external_reference,
      whatsapp,
      nome
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // PayFast4 expects integer amounts (e.g. "9" or "49").
    const amountNumber = Number(amount);
    const amountInt = Math.round(amountNumber);
    if (!Number.isFinite(amountInt) || amountInt <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Get OAuth token
    let token;
    try {
      token = await getPayFast4Token();
    } catch (tokenError) {
      console.error('❌ Failed to get PayFast4 token:', tokenError.message);
      return res.status(502).json({ error: 'Erro de autenticação com o gateway de pagamento' });
    }

    // Determine the public webhook URL
    let webhookUrl;
    if (WEBHOOK_BASE_URL) {
      webhookUrl = `${WEBHOOK_BASE_URL}/api/webhook/payfast4`;
    } else {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      webhookUrl = `${protocol}://${host}/api/webhook/payfast4`;
    }

    // Generate a unique external_id
    const extId = external_reference || `${(whatsapp || '').replace(/\D/g, '')}_${Date.now()}`;

    // Call PayFast4 QR Code API
    const apiUrl = `${PAYFAST4_API_URL}/pix/qrcode`;
    const payload = {
      amount: String(amountInt),
      external_id: extId,
      payerQuestion: 'comercio alimenticio',
      payer: {
        name: customer_name || nome || 'Cliente',
        document: customer_document || '',
        email: customer_email || ''
      },
      postbackUrl: webhookUrl
    };

    console.log('📤 Calling PayFast4:', apiUrl, '| postbackUrl:', webhookUrl);
    console.log('📤 Payload:', JSON.stringify(payload));

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    // Read response as text first to handle non-JSON responses
    const responseText = await apiResponse.text();
    console.log(`📥 PayFast4 response [${apiResponse.status}]:`, responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('❌ PayFast4 returned non-JSON response:', responseText.substring(0, 300));
      return res.status(502).json({
        error: 'Gateway retornou resposta inválida.',
        status: apiResponse.status
      });
    }

    if (!apiResponse.ok) {
      console.error('❌ PayFast4 HTTP error:', data);
      // If 401, clear token cache so next request gets a new one
      if (apiResponse.status === 401) {
        cachedToken = null;
        tokenExpiresAt = 0;
      }
      return res.status(apiResponse.status).json({ error: 'Erro ao criar pagamento', details: data });
    }

    // PayFast4 may return HTTP 200 with success:false
    if (data.success === false) {
      console.error('❌ PayFast4 business error:', data.message || data);
      return res.status(400).json({
        error: data.message || 'Erro ao criar pagamento no gateway',
        details: data
      });
    }

    // PayFast4 response - extract QR code fields
    const paymentData = data.data || data;
    const qrCodeRaw = paymentData.qrcode || paymentData.qr_code || paymentData.qrCode || '';
    const pixCopiaECola =
      paymentData.copiaecola ||
      paymentData.pix_copia_cola ||
      paymentData.qr_code_text ||
      paymentData.pixCopiaECola ||
      qrCodeRaw ||
      '';
    const transactionId = paymentData.transactionId || paymentData.transaction_id || paymentData.id || '';

    let qrCodeImage = '';
    if (typeof qrCodeRaw === 'string' && qrCodeRaw.trim()) {
      // Some gateways return an actual image URL/base64, others return the EMV (copy-paste) string.
      // Frontend expects an image src, so if it's not already a data URL, generate one.
      if (qrCodeRaw.startsWith('data:image/')) {
        qrCodeImage = qrCodeRaw;
      } else {
        try {
          qrCodeImage = await QRCode.toDataURL(qrCodeRaw, { width: 240, margin: 1 });
        } catch (qrErr) {
          console.error('⚠️  Failed to generate QR code image:', qrErr?.message || qrErr);
          qrCodeImage = '';
        }
      }
    }

    console.log('✅ Payment created:', { transactionId, amount: amountInt, external_id: extId });

    // Save in Supabase pix_payments table
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

        const { error: insertError } = await supabase
          .from('pix_payments')
          .insert([{
            payment_id: leadPaymentId,
            pix_code: pixCopiaECola,
            amount: amountInt,
            whatsapp: normalizedWhatsapp,
            nome: nome || customer_name || 'Cliente',
            email: customer_email || '',
            phone: '',
            payment_confirmed: false,
            expires_at: expiresAt,
            gateway_transaction_id: transactionId,
            external_reference: extId
          }]);

        if (insertError) {
          console.error('⚠️  Failed to save to pix_payments:', insertError.message);
        } else {
          console.log('✅ pix_payments record created for', normalizedWhatsapp);
        }
      } catch (dbError) {
        console.error('⚠️  Failed to save to pix_payments:', dbError.message);
      }
    }

    // Return relevant data to frontend
    return res.json({
      success: true,
      qr_code: qrCodeImage,
      pix_copia_cola: pixCopiaECola,
      qr_code_text: pixCopiaECola,
      transaction_id: transactionId,
      external_reference: extId,
      amount: amountInt,
      status: paymentData.status || 'pending',
      // Pass full response for debugging (remove in production)
      _raw: paymentData
    });
  } catch (error) {
    console.error('❌ create-payment error:', error);
    return res.status(500).json({ error: 'Erro interno ao criar pagamento' });
  }
});

// ─── POST /api/webhook/payfast4 ─────────────────────────────────────────────────
// PayFast4 sends payment notifications here via postbackUrl.
app.post('/api/webhook/payfast4', async (req, res) => {
  try {
    const payload = req.body;
    console.log('🔔 Webhook PayFast4 received:', JSON.stringify(payload, null, 2));

    // PayFast4 webhook format:
    // { requestBody: { transactionType, transactionId, external_id, amount, paymentType, status, dateApproval } }
    const webhookData = payload.requestBody || payload;
    const status = webhookData.status;
    const externalId = webhookData.external_id;
    const transactionId = webhookData.transactionId || webhookData.transaction_id;
    const amount = webhookData.amount;

    if (status === 'PAID' && supabase) {
      console.log(`✅ Payment PAID: txn=${transactionId} - R$ ${amount} - external_id=${externalId}`);

      let updated = false;

      // Update by external_reference (= external_id)
      if (externalId) {
        const { data: updateData, error: updateError } = await supabase
          .from('pix_payments')
          .update({ payment_confirmed: true })
          .eq('external_reference', externalId)
          .select('id, whatsapp');

        if (!updateError && updateData && updateData.length > 0) {
          updated = true;
          console.log(`✅ pix_payments updated by external_reference: ${externalId}`, updateData);
        }
      }

      // Fallback: update by gateway_transaction_id
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
        console.warn(`⚠️  Could not find pix_payment for external_id=${externalId} or txn=${transactionId}`);
      }
    } else if (status === 'PAID') {
      console.warn('⚠️  Payment PAID but Supabase not available');
    } else {
      console.log(`ℹ️  Webhook status: ${status} (no action taken)`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(200).json({ received: true, error: error.message });
  }
});

// ─── POST /api/check-payment ───────────────────────────────────────────────────
// Frontend polls this to check payment status
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
    ? `${WEBHOOK_BASE_URL}/api/webhook/payfast4`
    : `http://localhost:${PORT}/api/webhook/payfast4`;
  console.log(`   Webhook: ${publicWebhook}`);
  if (!PAYFAST4_CLIENT_ID || !PAYFAST4_CLIENT_SECRET) {
    console.warn('⚠️  PayFast4 credentials not configured! Payments will not work.');
  }
});
