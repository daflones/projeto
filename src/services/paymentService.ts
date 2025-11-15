import { supabase } from './supabase'

export type PaymentStatus = 'pending' | 'paid' | 'expired'

interface PendingPaymentRecord {
  id: string
  whatsapp: string | null
  payment_id: string | null
  amount: number
  nome: string | null
  pix_code: string
  phone: string | null
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

const PLAN_PLACEHOLDER_CODE = 'PLAN_SELECTION'
const PLAN_PLACEHOLDER_EMAIL = 'plan@placeholder'

function normalizeWhatsapp(whatsapp: string): string {
  return whatsapp.replace(/\D/g, '')
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

async function fetchPlanPlaceholder(whatsapp: string): Promise<PendingPaymentRecord | null> {
  const { data, error } = await supabase
    .from('pix_payments')
    .select('id, whatsapp, payment_id, amount, nome, pix_code, phone')
    .eq('whatsapp', whatsapp)
    .eq('pix_code', PLAN_PLACEHOLDER_CODE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    const statusCode = (error as { status?: number }).status
    if (statusCode === 404 || statusCode === 406) {
      return null
    }
    throw error
  }

  return data as PendingPaymentRecord | null
}

export async function upsertPendingPayment(payload: PendingPaymentPayload) {
  const normalizedWhatsapp = normalizeWhatsapp(payload.whatsapp)
  if (!normalizedWhatsapp) {
    throw new Error('Whatsapp inválido para criar pagamento pendente')
  }

  const lead = await fetchLeadByWhatsapp(normalizedWhatsapp)
  const existingPayment = await fetchPlanPlaceholder(normalizedWhatsapp)

  const resolvedName = payload.nome ?? existingPayment?.nome ?? lead?.nome ?? normalizedWhatsapp
  const planMetaPhone = `plan:${payload.plan_id}`
  const paymentId = lead?.payment_id ?? payload.payment_id ?? existingPayment?.payment_id ?? null
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()

  const baseRecord = {
    pix_code: PLAN_PLACEHOLDER_CODE,
    amount: payload.amount,
    whatsapp: normalizedWhatsapp,
    nome: resolvedName,
    payment_confirmed: false,
    expires_at: expiresAt,
    payment_id: paymentId,
    email: PLAN_PLACEHOLDER_EMAIL,
    phone: planMetaPhone
  }

  try {
    if (existingPayment) {
      await supabase
        .from('pix_payments')
        .update({ ...baseRecord, updated_at: new Date().toISOString() })
        .eq('id', existingPayment.id)
    } else {
      await supabase
        .from('pix_payments')
        .insert([{ ...baseRecord, created_at: new Date().toISOString() }])
    }
  } catch (error) {
    console.error('Falha ao sincronizar pix_payments', error)
  }

  return fetchPlanPlaceholder(normalizedWhatsapp)
}

export async function updatePendingPayment(payload: UpdatePendingPaymentPayload) {
  const normalizedWhatsapp = normalizeWhatsapp(payload.whatsapp)
  if (!normalizedWhatsapp) {
    throw new Error('Whatsapp inválido para atualizar pagamento pendente')
  }

  const existingPayment = await fetchPlanPlaceholder(normalizedWhatsapp)

  if (!existingPayment) {
    const fallbackPlanId: 'basic' | 'premium' = payload.plan_id ?? 'basic'
    const fallbackPlanName = payload.plan_name ?? (fallbackPlanId === 'premium' ? 'Plano Vitalício' : 'Análise Completa')
    return upsertPendingPayment({
      whatsapp: normalizedWhatsapp,
      amount: payload.amount ?? 0,
      plan_id: fallbackPlanId,
      plan_name: fallbackPlanName,
      payment_method: payload.payment_method ?? 'manual',
      status: payload.status,
      lead_id: payload.lead_id,
      payment_id: payload.payment_id,
      nome: payload.nome ?? normalizedWhatsapp
    })
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString()
  }

  if (payload.amount !== undefined) {
    updates.amount = payload.amount
  }
  if (payload.nome !== undefined) {
    updates.nome = payload.nome ?? normalizedWhatsapp
  }
  if (payload.plan_id) {
    updates.phone = `plan:${payload.plan_id}`
  } else if (!existingPayment.phone?.startsWith('plan:')) {
    updates.phone = existingPayment.phone ?? `plan:basic`
  }

  try {
    await supabase
      .from('pix_payments')
      .update(updates)
      .eq('id', existingPayment.id)
  } catch (error) {
    console.error('Falha ao atualizar pix_payments', error)
  }

  return fetchPlanPlaceholder(normalizedWhatsapp)
}
