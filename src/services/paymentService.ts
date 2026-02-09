import { supabase } from './supabase'

export type PaymentStatus = 'pending' | 'paid' | 'expired'

interface PendingPaymentRecord {
  id: string
  whatsapp: string | null
  payment_id: string | null
  amount: number
  nome: string | null
}

export interface PendingPaymentPayload {
  whatsapp: string
  amount: number
  plan_id: 'basic' | 'premium'
  plan_name: string
  payment_method: 'pix' | 'card' | 'manual'
  status?: PaymentStatus
  lead_id?: string
  payment_id?: string
  nome?: string | null
}

export interface UpdatePendingPaymentPayload extends Partial<Omit<PendingPaymentPayload, 'whatsapp' | 'plan_id' | 'plan_name'>> {
  whatsapp: string
  plan_id?: 'basic' | 'premium'
  plan_name?: string
}

const PAYMENT_EXPIRATION_MINUTES = 15

function normalizeWhatsapp(whatsapp: string): string {
  return whatsapp.replace(/\D/g, '')
}

const paymentOperationQueues = new Map<string, Promise<any>>()

async function queuePaymentOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = paymentOperationQueues.get(key) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(operation)

  paymentOperationQueues.set(key, next)

  try {
    return await next
  } finally {
    if (paymentOperationQueues.get(key) === next) {
      paymentOperationQueues.delete(key)
    }
  }
}

async function fetchLeadByWhatsapp(whatsapp: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('id, whatsapp, payment_id, nome')
    .eq('whatsapp', whatsapp)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as { id: string; whatsapp: string; payment_id: string | null; nome: string | null } | null
}

async function fetchLatestPendingPayment(whatsapp: string): Promise<PendingPaymentRecord | null> {
  // DO NOT use .maybeSingle() here — it returns 406 when multiple pending
  // records exist, which caused the snowball duplicate bug.
  const { data, error } = await supabase
    .from('pix_payments')
    .select('id, whatsapp, payment_id, amount, nome')
    .eq('whatsapp', whatsapp)
    .eq('payment_confirmed', false)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('fetchLatestPendingPayment error:', error.message)
    return null
  }

  if (!data || data.length === 0) return null
  return data[0] as PendingPaymentRecord
}

export async function upsertPendingPayment(payload: PendingPaymentPayload) {
  const normalizedWhatsapp = normalizeWhatsapp(payload.whatsapp)
  if (!normalizedWhatsapp) {
    throw new Error('Whatsapp inválido para criar pagamento pendente')
  }

  return queuePaymentOperation(normalizedWhatsapp, async () => {
    const lead = await fetchLeadByWhatsapp(normalizedWhatsapp)
    const existingPayment = await fetchLatestPendingPayment(normalizedWhatsapp)

    const resolvedName = payload.nome ?? existingPayment?.nome ?? lead?.nome ?? normalizedWhatsapp
    const paymentId = lead?.payment_id ?? payload.payment_id ?? existingPayment?.payment_id ?? null
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRATION_MINUTES * 60 * 1000).toISOString()

    // Only UPDATE existing records (created by the server via /api/create-payment).
    // Never INSERT placeholder rows from the frontend — the server is the single
    // source of truth for pix_payments record creation.
    if (!existingPayment) {
      return null
    }

    try {
      await supabase
        .from('pix_payments')
        .update({
          amount: payload.amount,
          nome: resolvedName,
          payment_confirmed: false,
          expires_at: expiresAt,
          payment_id: paymentId ?? existingPayment.payment_id,
          plan_id: payload.plan_id,
          plan_name: payload.plan_name
        })
        .eq('id', existingPayment.id)

      // Clean up any OTHER pending duplicates for this whatsapp
      await supabase
        .from('pix_payments')
        .delete()
        .eq('whatsapp', normalizedWhatsapp)
        .eq('payment_confirmed', false)
        .neq('id', existingPayment.id)
    } catch (error) {
      console.error('Falha ao sincronizar pix_payments', error)
    }

    return fetchLatestPendingPayment(normalizedWhatsapp)
  })
}

export async function updatePendingPayment(payload: UpdatePendingPaymentPayload) {
  const normalizedWhatsapp = normalizeWhatsapp(payload.whatsapp)
  if (!normalizedWhatsapp) {
    throw new Error('Whatsapp inválido para atualizar pagamento pendente')
  }

  return queuePaymentOperation(normalizedWhatsapp, async () => {
    const existingPayment = await fetchLatestPendingPayment(normalizedWhatsapp)

    // If no server-created record exists yet, skip — the server will create
    // the authoritative record when the PIX QR code is generated.
    if (!existingPayment) {
      return null
    }

    const updates: Record<string, any> = {
      amount: payload.amount ?? existingPayment.amount,
      nome: payload.nome ?? normalizedWhatsapp,
      payment_confirmed: false,
      payment_id: payload.payment_id ?? existingPayment.payment_id
    }

    try {
      await supabase
        .from('pix_payments')
        .update(updates)
        .eq('id', existingPayment.id)

      // Clean up any OTHER pending duplicates for this whatsapp
      await supabase
        .from('pix_payments')
        .delete()
        .eq('whatsapp', normalizedWhatsapp)
        .eq('payment_confirmed', false)
        .neq('id', existingPayment.id)
    } catch (error) {
      console.error('Falha ao atualizar pix_payments', error)
    }

    return fetchLatestPendingPayment(normalizedWhatsapp)
  })
}

/**
 * Verifica se um número de whatsapp já possui algum pagamento confirmado (PIX ou cartão).
 * Retorna true se já pagou, false caso contrário.
 */
export async function hasConfirmedPayment(whatsapp: string): Promise<boolean> {
  const normalized = normalizeWhatsapp(whatsapp)
  if (!normalized) return false

  try {
    // Checar pix_payments
    const { data: pixData } = await supabase
      .from('pix_payments')
      .select('id')
      .eq('whatsapp', normalized)
      .eq('payment_confirmed', true)
      .limit(1)

    if (pixData && pixData.length > 0) return true

    // Checar card_attempts
    const { data: cardData } = await supabase
      .from('card_attempts')
      .select('id')
      .eq('whatsapp', normalized)
      .eq('payment_confirmed', true)
      .limit(1)

    if (cardData && cardData.length > 0) return true

    return false
  } catch {
    return false
  }
}
