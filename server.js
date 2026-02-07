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

// Evolution API (for error notifications via WhatsApp)
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || process.env.VITE_EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.VITE_EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || process.env.VITE_EVOLUTION_INSTANCE || '';
const ERROR_NOTIFY_JID = '5521968053672';

// ─── Supabase client (server-side) ─────────────────────────────────────────────
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️  Supabase credentials not found – webhook will not update DB');
}

// ─── Evolution API: Error Notification via WhatsApp ────────────────────────────────────
async function notifyPayFast4Error(context, errorData, payload) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.warn('⚠️  Evolution API not configured – skipping error notification');
    return;
  }
  try {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const text = [
      `⚠️ *ERRO PAYFAST4* ⚠️`,
      ``,
      `📅 *Data/Hora:* ${now}`,
      `📌 *Contexto:* ${context}`,
      ``,
      `❌ *Erro retornado:*`,
      '```',
      JSON.stringify(errorData, null, 2).substring(0, 1500),
      '```',
      ``,
      `📦 *Payload enviado:*`,
      '```',
      JSON.stringify(payload, null, 2).substring(0, 1500),
      '```',
      ``,
      `🔍 Por favor verifique o painel e os logs do servidor imediatamente.`
    ].join('\n');

    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: ERROR_NOTIFY_JID,
        text
      })
    });

    if (!resp.ok) {
      console.error('⚠️  Evolution API notification failed:', resp.status, await resp.text().catch(() => ''));
    } else {
      console.log('✅ Error notification sent via WhatsApp');
    }
  } catch (err) {
    console.error('⚠️  Failed to send Evolution API notification:', err.message);
  }
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
      nome,
      plan_id,
      plan_name
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // PayFast4 accepts decimal amounts. Send as string with 2 decimals using dot separator.
    const amountFormatted = amountNumber.toFixed(2);

    // Get OAuth token
    let token;
    try {
      token = await getPayFast4Token();
    } catch (tokenError) {
      console.error('❌ Failed to get PayFast4 token:', tokenError.message);
      await notifyPayFast4Error('Falha ao obter token OAuth', { error: tokenError.message }, payload || req.body);
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
      amount: amountFormatted,
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
      await notifyPayFast4Error(`HTTP ${apiResponse.status} - Resposta não-JSON`, { raw: responseText.substring(0, 500) }, payload);
      return res.status(502).json({
        error: 'Gateway retornou resposta inválida.',
        status: apiResponse.status
      });
    }

    if (!apiResponse.ok) {
      console.error('❌ PayFast4 HTTP error:', data);
      await notifyPayFast4Error(`HTTP ${apiResponse.status} ao criar pagamento PIX`, data, payload);
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
      await notifyPayFast4Error('PayFast4 retornou success:false', data, payload);
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

    console.log('✅ Payment created:', { transactionId, amount: amountNumber, external_id: extId });

    // Save in Supabase pix_payments table (upsert: update existing pending record or insert new)
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

        const recordData = {
          payment_id: leadPaymentId,
          pix_code: pixCopiaECola,
          amount: Number(amountFormatted),
          whatsapp: normalizedWhatsapp,
          nome: nome || customer_name || 'Cliente',
          email: customer_email || '',
          phone: '',
          payment_confirmed: false,
          expires_at: expiresAt,
          gateway_transaction_id: transactionId,
          external_reference: extId,
          plan_id: plan_id || null,
          plan_name: plan_name || null
        };

        // Check for an existing pending record to UPDATE instead of creating duplicates
        const { data: existingRows } = await supabase
          .from('pix_payments')
          .select('id')
          .eq('whatsapp', normalizedWhatsapp)
          .eq('payment_confirmed', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          // Update the existing record with new PIX data
          const { error: updateError } = await supabase
            .from('pix_payments')
            .update(recordData)
            .eq('id', existingRows[0].id);

          if (updateError) {
            console.error('⚠️  Failed to update pix_payments:', updateError.message);
          } else {
            console.log('✅ pix_payments record updated for', normalizedWhatsapp);
          }

          // Clean up any OTHER pending duplicates
          if (existingRows.length > 0) {
            await supabase
              .from('pix_payments')
              .delete()
              .eq('whatsapp', normalizedWhatsapp)
              .eq('payment_confirmed', false)
              .neq('id', existingRows[0].id);
          }
        } else {
          // No existing record — insert new
          const { error: insertError } = await supabase
            .from('pix_payments')
            .insert([recordData]);

          if (insertError) {
            console.error('⚠️  Failed to save to pix_payments:', insertError.message);
          } else {
            console.log('✅ pix_payments record created for', normalizedWhatsapp);
          }
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
      amount: Number(amountFormatted),
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
      const webhookAmount = Number(amount);

      // Update by external_reference (= external_id)
      if (externalId) {
        // First, fetch the record to validate the amount
        const { data: records } = await supabase
          .from('pix_payments')
          .select('id, whatsapp, amount')
          .eq('external_reference', externalId);

        if (records && records.length > 0) {
          const record = records[0];
          const storedAmount = Number(record.amount);

          // Validate: webhook amount must match stored amount (tolerance of R$0.05)
          if (Number.isFinite(webhookAmount) && Math.abs(webhookAmount - storedAmount) > 0.05) {
            console.warn(`⚠️  Amount mismatch! Webhook: R$${webhookAmount}, Stored: R$${storedAmount}. Rejecting confirmation for external_id=${externalId}`);
          } else {
            const { error: updateError } = await supabase
              .from('pix_payments')
              .update({ payment_confirmed: true })
              .eq('id', record.id);

            if (!updateError) {
              updated = true;
              console.log(`✅ pix_payments updated by external_reference: ${externalId}`);
            }
          }
        }
      }

      // Fallback: update by gateway_transaction_id
      if (!updated && transactionId) {
        const { data: records } = await supabase
          .from('pix_payments')
          .select('id, whatsapp, amount')
          .eq('gateway_transaction_id', transactionId);

        if (records && records.length > 0) {
          const record = records[0];
          const storedAmount = Number(record.amount);

          if (Number.isFinite(webhookAmount) && Math.abs(webhookAmount - storedAmount) > 0.05) {
            console.warn(`⚠️  Amount mismatch! Webhook: R$${webhookAmount}, Stored: R$${storedAmount}. Rejecting confirmation for txn=${transactionId}`);
          } else {
            const { error: updateError } = await supabase
              .from('pix_payments')
              .update({ payment_confirmed: true })
              .eq('id', record.id);

            if (!updateError) {
              updated = true;
              console.log(`✅ pix_payments updated by gateway_transaction_id: ${transactionId}`);
            }
          }
        }
      }

      if (!updated) {
        console.warn(`⚠️  Could not confirm pix_payment for external_id=${externalId} or txn=${transactionId} (not found or amount mismatch)`);
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
      // Only check records created in the last 20 minutes to avoid
      // returning old confirmed payments (e.g. previous Plan A purchases)
      const recentCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      query = query
        .eq('whatsapp', whatsapp.replace(/\D/g, ''))
        .gte('created_at', recentCutoff)
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

// ─── POST /api/check-access ─────────────────────────────────────────────────────
// Checks if a whatsapp number has a valid premium (Plan B) payment within 7 days.
// Plan A (basic) NEVER grants automatic access – always requires a new purchase.
app.post('/api/check-access', async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ hasAccess: false });
    }

    const { whatsapp } = req.body;
    if (!whatsapp) {
      return res.json({ hasAccess: false });
    }

    const cleanWa = whatsapp.replace(/\D/g, '');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('pix_payments')
      .select('id, plan_id, created_at')
      .eq('whatsapp', cleanWa)
      .eq('payment_confirmed', true)
      .eq('plan_id', 'premium')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('check-access error:', error.message);
      return res.json({ hasAccess: false });
    }

    const hasAccess = Array.isArray(data) && data.length > 0;
    return res.json({
      hasAccess,
      plan_id: hasAccess ? data[0].plan_id : null,
      paid_at: hasAccess ? data[0].created_at : null
    });
  } catch (err) {
    console.error('check-access error:', err);
    return res.json({ hasAccess: false });
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
