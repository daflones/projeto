import { useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { createPixPayment, checkPixPaymentStatus, generatePixCode, getActivePixPayment, type PixPayment } from '../services/supabase'

interface QRCodePixProps {
  amount: number
  email?: string
  phone?: string
  whatsapp?: string
  nome?: string
  hasDiscount?: boolean
  onPaymentConfirmed?: () => void
}

const QRCodePix = ({ amount, email, phone, whatsapp, nome, hasDiscount, onPaymentConfirmed }: QRCodePixProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutos
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null)
  const [pixCode, setPixCode] = useState('')
  const [isExpired, setIsExpired] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const hasInitialized = useRef(false)

  // Função para criar ou reutilizar PIX existente
  const createNewPix = useCallback(async () => {
    setIsGenerating(true)
    try {
      // Primeiro, verificar se já existe um PIX ativo não expirado
      const activePixResult = await getActivePixPayment(email || '', phone || '', amount)
      
      if (activePixResult.success && activePixResult.data) {
        // Reutilizar PIX existente
        setPixPaymentId(activePixResult.data.id)
        setPixCode(activePixResult.data.pix_code)
        
        // Calcular tempo restante até expiração
        const expiresAt = new Date(activePixResult.data.expires_at)
        const now = new Date()
        const secondsLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
        setTimeLeft(secondsLeft > 0 ? secondsLeft : 0)
        setIsExpired(secondsLeft <= 0)
      } else {
        // Criar novo PIX se não houver ativo
        const description = hasDiscount ? 'Detector Traicao - 20% OFF' : 'Detector de Traicao'
        const pixData = generatePixCode(amount, description)
        const expiresAt = new Date()
        expiresAt.setMinutes(expiresAt.getMinutes() + 15) // 15 minutos

        // Buscar payment_id do lead se whatsapp foi fornecido
        let paymentId: string | undefined
        if (whatsapp) {
          const { data: leadData } = await getActivePixPayment(email || '', phone || '', amount)
          // Se não encontrou PIX ativo, buscar o payment_id do lead
          if (!leadData) {
            const { data: lead, error: leadError } = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/leads?whatsapp=eq.${whatsapp}&order=created_at.desc&limit=1`, {
              headers: {
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              }
            }).then(r => r.json()).catch(() => ({ data: null, error: true }))
            
            if (!leadError && lead && lead.length > 0) {
              paymentId = lead[0].payment_id
            }
          }
        }

        const pixPayment: Omit<PixPayment, 'id' | 'created_at'> = {
          payment_id: paymentId,
          pix_code: pixData.pixCode,
          amount,
          email: email || '',
          phone: phone || '',
          whatsapp: whatsapp || '',
          nome: nome || 'Usuário',
          payment_confirmed: false,
          expires_at: expiresAt.toISOString()
        }

        const result = await createPixPayment(pixPayment)
        
        if (result.success && result.data) {
          setPixPaymentId(result.data.id)
          setPixCode(pixData.pixCode)
          setTimeLeft(900) // Reset para 15 minutos
          setIsExpired(false)
        }
      }
    } catch (error) {
      // Erro ao criar PIX
    } finally {
      setIsGenerating(false)
    }
  }, [amount, email, phone, whatsapp, nome, hasDiscount])

  // Inicializar PIX na montagem do componente
  useEffect(() => {
    // Evitar execução dupla em React Strict Mode
    if (hasInitialized.current) return
    hasInitialized.current = true
    
    createNewPix()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Regenerar QR Code quando dados principais mudarem após inicialização
  useEffect(() => {
    if (!hasInitialized.current) return

    setCopied(false)
    setPixPaymentId(null)
    setPixCode('')
    setIsExpired(false)
    setTimeLeft(900)

    void createNewPix()
  }, [amount, hasDiscount, whatsapp, email, phone, nome, createNewPix])

  // Gerar QR Code quando pixCode mudar
  useEffect(() => {
    if (canvasRef.current && pixCode) {
      QRCode.toCanvas(canvasRef.current, pixCode, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
    }
  }, [pixCode])

  // Timer de expiração - Otimizado para 2s
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 2) {
          setIsExpired(true)
          clearInterval(timer)
          return 0
        }
        return prev - 2
      })
    }, 2000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Polling para verificar pagamento
  useEffect(() => {
    if (!pixPaymentId || isExpired) return

    const checkPayment = async () => {
      const result = await checkPixPaymentStatus(pixPaymentId)
      
      if (result.success && result.data?.payment_confirmed) {
        if (onPaymentConfirmed) {
          onPaymentConfirmed()
        }
      }
    }

    // Verificar imediatamente e depois a cada 5 segundos (otimizado)
    checkPayment()
    const pollInterval = setInterval(checkPayment, 5000)

    return () => clearInterval(pollInterval)
  }, [pixPaymentId, isExpired, onPaymentConfirmed])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Erro ao copiar
    }
  }

  return (
    <div className="glass-card p-8 text-center warning-glow">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-3 text-gray-800">
          Pagamento via PIX
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Escaneie o QR Code ou copie o código PIX
        </p>
        <div className="text-3xl font-bold text-red-600 mb-2">
          R$ {amount.toFixed(2).replace('.', ',')}
        </div>
        <div className="text-red-600 font-semibold text-sm">
          Expira em: {formatTime(timeLeft)}
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white p-4 rounded-xl mb-6 mx-auto w-fit">
        <canvas ref={canvasRef} />
      </div>

      {/* PIX Code */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Código PIX (Copia e Cola):
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={pixCode}
            readOnly
            className="input-field flex-1 text-xs"
          />
          <button
            onClick={copyPixCode}
            className="btn-secondary p-3"
            title="Copiar código PIX"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
        {copied && (
          <p className="text-green-400 text-sm mt-2">
            Código PIX copiado!
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-xl mb-6 text-left">
        <h4 className="font-bold text-gray-800 mb-3 text-base">
          Como pagar:
        </h4>
        <div className="text-gray-700 text-sm space-y-2">
          <div className="font-medium">1. Abra o app do seu banco</div>
          <div className="font-medium">2. Escolha a opção PIX</div>
          <div className="font-medium">3. Escaneie o QR Code ou cole o código</div>
          <div className="font-medium">4. Confirme o pagamento</div>
          <div className="font-medium">5. Aguarde a confirmação automática</div>
        </div>
      </div>

      {/* Status and Actions */}
      {isExpired ? (
        <div className="mb-6">
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
            <p className="text-red-300 font-semibold">QR Code Expirado</p>
            <p className="text-gray-400 text-sm mt-1">
              Clique no botão abaixo para gerar um novo código PIX
            </p>
          </div>
          <button
            onClick={createNewPix}
            disabled={isGenerating}
            className="w-full btn-primary"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Gerando Novo QR Code...
              </div>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                GERAR NOVO QR CODE
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-center mb-2">
              <div className="w-3 h-3 bg-gray-900 rounded-full mr-2"></div>
              <p className="text-gray-900 font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Aguardando Pagamento...</p>
            </div>
            <p className="text-gray-600 text-sm">
              O sistema verificará automaticamente quando o pagamento for confirmado
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        {isExpired 
          ? 'Gere um novo QR Code para continuar com o pagamento'
          : 'Você será redirecionado automaticamente após a confirmação do pagamento'
        }
      </p>
    </div>
  )
}

export default QRCodePix
