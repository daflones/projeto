import { supabase } from './supabase'

// =====================================================
// INTERFACES
// =====================================================

export interface AdminUser {
  id: string
  email: string
  nome: string
  is_active: boolean
  created_at?: string
  last_login?: string
}

export interface SystemSetting {
  id: string
  setting_key: string
  setting_value: string
  description?: string
  updated_at?: string
}

export interface AnalyticsEvent {
  id?: string
  event_type: string
  event_name?: string
  page_path?: string
  whatsapp?: string
  user_session_id?: string
  event_data?: Record<string, any>
  created_at?: string
}

export interface ConversionFunnelStep {
  id?: string
  whatsapp?: string
  user_session_id?: string
  step_name: string
  step_order: number
  completed_at?: string
  metadata?: Record<string, any>
}

export interface DashboardStats {
  total_page_views: number
  total_leads: number
  leads_with_payment: number
  total_checkouts: number
  total_sales_pix: number
  total_sales_card: number
  total_sales: number
  revenue_pix: number
  revenue_card: number
  total_revenue: number
  avg_ticket: number
  lead_conversion_rate: number
  checkout_conversion_rate: number
  overall_conversion_rate: number
  payment_rate: number
  pending_payments: number
  expired_payments: number
  no_payment_leads: number
}

export interface EventsByDay {
  date: string
  page_views: number
  leads: number
  checkouts: number
  sales: number
  revenue: number
}

export interface FunnelStats {
  step_name: string
  step_order: number
  total_users: number
  conversion_rate: number
}

// =====================================================
// AUTENTICAÇÃO ADMIN
// =====================================================

/**
 * Autentica um administrador
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<AdminUser | null> {
  try {
    const { data, error } = await supabase.rpc('authenticate_admin', {
      p_email: email,
      p_password: password
    })

    if (error) {
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    // Mapear os nomes das colunas retornadas pela função
    const adminData = data[0]
    return {
      id: adminData.admin_id,
      email: adminData.admin_email,
      nome: adminData.admin_nome,
      is_active: adminData.admin_is_active
    } as AdminUser
  } catch (error) {
    return null
  }
}

/**
 * Cria um novo administrador (usar apenas uma vez)
 */
export async function createAdminUser(
  email: string,
  password: string,
  nome: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_admin_user', {
      p_email: email,
      p_password: password,
      p_nome: nome
    })

    if (error) {
      return null
    }

    return data as string
  } catch (error) {
    return null
  }
}

// =====================================================
// CONFIGURAÇÕES DO SISTEMA
// =====================================================

/**
 * Obtém uma configuração do sistema
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_system_setting', {
      p_setting_key: key
    })

    if (error) {
      return null
    }

    return data as string
  } catch (error) {
    return null
  }
}

/**
 * Atualiza uma configuração do sistema
 */
export async function updateSystemSetting(
  key: string,
  value: string,
  adminId?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('update_system_setting', {
      p_setting_key: key,
      p_setting_value: value,
      p_admin_id: adminId || null
    })

    if (error) {
      return false
    }

    return data as boolean
  } catch (error) {
    return false
  }
}

/**
 * Obtém todas as configurações
 */
export async function getAllSettings(): Promise<SystemSetting[]> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key')

    if (error) {
      return []
    }

    return data as SystemSetting[]
  } catch (error) {
    return []
  }
}

// =====================================================
// ANALYTICS
// =====================================================

/**
 * Registra um evento de analytics
 */
export async function trackAnalyticsEvent(
  eventType: string,
  eventName?: string,
  pagePath?: string,
  whatsapp?: string,
  sessionId?: string,
  eventData?: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('track_analytics_event', {
      p_event_type: eventType,
      p_event_name: eventName || null,
      p_page_path: pagePath || null,
      p_whatsapp: whatsapp || null,
      p_session_id: sessionId || null,
      p_event_data: eventData || null
    })

    if (error) {
      return null
    }

    return data as string
  } catch (error) {
    return null
  }
}

/**
 * Registra um passo do funil de conversão
 */
export async function trackFunnelStep(
  whatsapp: string,
  sessionId: string,
  stepName: string,
  stepOrder: number,
  metadata?: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('track_funnel_step', {
      p_whatsapp: whatsapp,
      p_session_id: sessionId,
      p_step_name: stepName,
      p_step_order: stepOrder,
      p_metadata: metadata || null
    })

    if (error) {
      return null
    }

    return data as string
  } catch (error) {
    return null
  }
}

/**
 * Obtém estatísticas completas do dashboard com dados reais do banco
 */
export async function getDashboardStats(
  startDate?: Date,
  endDate?: Date
): Promise<DashboardStats | null> {
  try {
    // Tentar usar a nova função SQL primeiro
    const { data, error } = await supabase.rpc('get_complete_sales_stats', {
      p_start_date: startDate?.toISOString() || null,
      p_end_date: endDate?.toISOString() || null
    })

    if (error) {
      // Fallback: tentar função antiga
      const { data: oldData, error: oldError } = await supabase.rpc('get_dashboard_stats', {
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null
      })

      if (oldError || !oldData || oldData.length === 0) {
        return {
          total_page_views: 0,
          total_leads: 0,
          leads_with_payment: 0,
          total_checkouts: 0,
          total_sales_pix: 0,
          total_sales_card: 0,
          total_sales: 0,
          revenue_pix: 0,
          revenue_card: 0,
          total_revenue: 0,
          avg_ticket: 0,
          lead_conversion_rate: 0,
          checkout_conversion_rate: 0,
          overall_conversion_rate: 0,
          payment_rate: 0,
          pending_payments: 0,
          expired_payments: 0,
          no_payment_leads: 0
        }
      }

      // Adaptar dados antigos
      const old = oldData[0]
      return {
        total_page_views: old.total_page_views || 0,
        total_leads: old.total_leads || 0,
        leads_with_payment: 0,
        total_checkouts: old.total_checkouts || 0,
        total_sales_pix: 0,
        total_sales_card: 0,
        total_sales: old.total_purchases || 0,
        revenue_pix: 0,
        revenue_card: 0,
        total_revenue: old.total_revenue || 0,
        avg_ticket: old.avg_ticket || 0,
        lead_conversion_rate: old.conversion_rate_lead || 0,
        checkout_conversion_rate: old.conversion_rate_purchase || 0,
        overall_conversion_rate: 0,
        payment_rate: 0,
        pending_payments: 0,
        expired_payments: 0,
        no_payment_leads: 0
      }
    }

    if (!data || data.length === 0) {
      return {
        total_page_views: 0,
        total_leads: 0,
        leads_with_payment: 0,
        total_checkouts: 0,
        total_sales_pix: 0,
        total_sales_card: 0,
        total_sales: 0,
        revenue_pix: 0,
        revenue_card: 0,
        total_revenue: 0,
        avg_ticket: 0,
        lead_conversion_rate: 0,
        checkout_conversion_rate: 0,
        overall_conversion_rate: 0,
        payment_rate: 0,
        pending_payments: 0,
        expired_payments: 0,
        no_payment_leads: 0
      }
    }

    return data[0] as DashboardStats
  } catch (error) {
    return null
  }
}

/**
 * Obtém eventos por dia com vendas e receita
 */
export async function getEventsByDay(days: number = 30): Promise<EventsByDay[]> {
  try {
    // Tentar usar nova função
    const { data, error } = await supabase.rpc('get_sales_by_day', {
      p_days: days
    })

    if (!error && data) {
      return data as EventsByDay[]
    }

    // Fallback: tentar função antiga
    const { data: oldData, error: oldError } = await supabase.rpc('get_events_by_day', {
      p_days: days
    })

    if (oldError) {
      return []
    }

    // Adaptar dados antigos adicionando revenue como 0
    return (oldData || []).map((item: any) => ({
      ...item,
      sales: item.purchases || 0,
      revenue: 0
    })) as EventsByDay[]
  } catch (error) {
    return []
  }
}

/**
 * Obtém estatísticas do funil de conversão completo
 */
export async function getConversionFunnelStats(
  startDate?: Date,
  endDate?: Date
): Promise<FunnelStats[]> {
  try {
    // Tentar usar nova função
    const { data, error } = await supabase.rpc('get_complete_funnel', {
      p_start_date: startDate?.toISOString() || null,
      p_end_date: endDate?.toISOString() || null
    })

    if (!error && data) {
      return data as FunnelStats[]
    }

    // Fallback: tentar função antiga
    const { data: oldData, error: oldError } = await supabase.rpc('get_conversion_funnel_stats', {
      p_start_date: startDate?.toISOString() || null,
      p_end_date: endDate?.toISOString() || null
    })

    if (!oldError && oldData) {
      return oldData as FunnelStats[]
    }

    // Fallback final: buscar direto da tabela conversion_funnel
    let query = supabase
      .from('conversion_funnel')
      .select('*')
      .order('step_order', { ascending: true })

    if (startDate) {
      query = query.gte('completed_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('completed_at', endDate.toISOString())
    }

    const { data: tableData, error: tableError } = await query

    if (tableError) {
      return []
    }

    // Agrupar por step_name e calcular estatísticas
    const stepMap = new Map<string, { step_name: string; step_order: number; count: number }>()
    
    tableData?.forEach(row => {
      const key = row.step_name
      if (!stepMap.has(key)) {
        stepMap.set(key, {
          step_name: row.step_name,
          step_order: row.step_order || 0,
          count: 0
        })
      }
      stepMap.get(key)!.count++
    })

    // Converter para array e ordenar
    const steps = Array.from(stepMap.values()).sort((a, b) => a.step_order - b.step_order)
    
    // Calcular conversões
    const result: FunnelStats[] = steps.map((step, index) => {
      const prevStep = index > 0 ? steps[index - 1] : null
      const conversion_rate = prevStep ? (step.count / prevStep.count) * 100 : 100
      const dropoff = prevStep ? prevStep.count - step.count : 0
      const dropoff_rate = prevStep ? (dropoff / prevStep.count) * 100 : 0

      return {
        step_name: step.step_name,
        step_order: step.step_order,
        total_users: step.count,
        conversion_rate: Math.round(conversion_rate * 10) / 10,
        dropoff: dropoff,
        dropoff_rate: Math.round(dropoff_rate * 10) / 10
      }
    })

    return result
  } catch (error) {
    return []
  }
}

/**
 * Obtém eventos recentes
 */
export async function getRecentEvents(limit: number = 100): Promise<AnalyticsEvent[]> {
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return []
    }

    return data as AnalyticsEvent[]
  } catch (error) {
    return []
  }
}

/**
 * Obtém todos os leads com status de pagamento
 */
export async function getAllLeads(): Promise<any[]> {
  try {
    // Usar a view que faz JOIN com pagamentos
    const { data, error } = await supabase
      .from('leads_with_payment_status')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}

/**
 * Obtém todos os resultados de análise
 */
export async function getAllAnalysisResults(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}

/**
 * Atualiza status de pagamento usando payment_id
 */
export async function updateLeadPaymentStatus(
  paymentId: string,
  paymentConfirmed: boolean
): Promise<boolean> {
  try {
    const functionName = paymentConfirmed ? 'confirm_payment' : 'cancel_payment'
    
    const { data, error } = await supabase.rpc(functionName, {
      p_payment_id: paymentId
    })

    if (error) {
      return false
    }

    return data as boolean
  } catch (error) {
    return false
  }
}

/**
 * Obtém estatísticas de pagamentos (versão atualizada com payment_id)
 */
export async function getPaymentStats(): Promise<{
  total_leads: number
  leads_with_payment: number
  paid_leads: number
  pending_leads: number
  expired_leads: number
  no_payment_leads: number
  total_revenue: number
  payment_rate: number
} | null> {
  try {
    // Tentar usar a versão v2 primeiro
    let { data, error } = await supabase.rpc('get_payment_stats_v2')

    // Se não existir, usar a versão antiga
    if (error && error.message?.includes('function')) {
      const result = await supabase.rpc('get_payment_stats')
      if (result.error) {
        return null
      }
      
      // Adaptar dados da versão antiga
      const oldData = result.data?.[0]
      if (!oldData) {
        return {
          total_leads: 0,
          leads_with_payment: 0,
          paid_leads: 0,
          pending_leads: 0,
          expired_leads: 0,
          no_payment_leads: 0,
          total_revenue: 0,
          payment_rate: 0
        }
      }
      
      return {
        total_leads: oldData.total_leads || 0,
        leads_with_payment: oldData.paid_leads || 0,
        paid_leads: oldData.paid_leads || 0,
        pending_leads: 0,
        expired_leads: 0,
        no_payment_leads: oldData.unpaid_leads || 0,
        total_revenue: 0,
        payment_rate: oldData.payment_rate || 0
      }
    }

    if (error) {
      return null
    }

    if (!data || data.length === 0) {
      return {
        total_leads: 0,
        leads_with_payment: 0,
        paid_leads: 0,
        pending_leads: 0,
        expired_leads: 0,
        no_payment_leads: 0,
        total_revenue: 0,
        payment_rate: 0
      }
    }

    return data[0]
  } catch (error) {
    return null
  }
}

/**
 * Obtém todos os pagamentos PIX
 */
export async function getAllPixPayments(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('pix_payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}

/**
 * Obtém todos os dados de cartão
 */
export async function getAllCardPayments(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('card_data')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}
