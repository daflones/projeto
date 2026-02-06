import { useEffect, useRef, useCallback, useState } from 'react'
import { Copy, Check, RefreshCw, AlertCircle } from 'lucide-react'

interface QRCodePixProps {
  amount: number
  email?: string
  phone?: string
  whatsapp?: string
  nome?: string
  hasDiscount?: boolean
  onPaymentConfirmed?: () => void
}

interface GatewayPaymentData {
  qr_code: string        // base64 image
  qr_code_text: string   // pix copia e cola
  pix_copia_cola: string
  external_reference: string
  id: string
  payment_id: string
}

const QRCodePix = ({ amount, email, phone, whatsapp, nome, hasDiscount, onPaymentConfirmed }: QRCodePixProps) => {
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutos
  const [pixCode, setPixCode] = useState('')
  const [qrCodeImage, setQrCodeImage] = useState('')
  const [externalReference, setExternalReference] = useState('')
  const [isExpired, setIsExpired] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const hasInitialized = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Função para criar pagamento via DBXBankPay (através do nosso servidor)
  const createNewPix = useCallback(async () => {
    setIsGenerating(true)
    setError('')
    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          customer_name: nome || 'Cliente',
          customer_email: email || '',
          customer_phone: phone || (whatsapp || '').replace(/\D/g, ''),
          whatsapp: whatsapp || '',
          nome: nome || 'Cliente'
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('Erro ao criar pagamento:', data)
        setError(data.error || 'Erro ao gerar QR Code. Tente novamente.')
        return
      }

      const paymentData = data as GatewayPaymentData & { success: boolean }

      // Set QR code image (base64 from gateway)
      setQrCodeImage(paymentData.qr_code || '')
      // Set PIX copia e cola text
      setPixCode(paymentData.pix_copia_cola || paymentData.qr_code_text || '')
      // Set external reference for polling
      setExternalReference(paymentData.external_reference || '')
      // Reset timer
      setTimeLeft(900)
      setIsExpired(false)
    } catch (err) {
      console.error('Erro ao criar pagamento:', err)
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }, [amount, email, phone, whatsapp, nome])

  // Inicializar PIX na montagem do componente
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    createNewPix()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Polling para verificar pagamento (via Supabase + server endpoint)
  useEffect(() => {
    if (isExpired || (!externalReference && !whatsapp)) return

    const checkPayment = async () => {
      try {
        // Primary: check via server endpoint using external_reference
        if (externalReference) {
          const res = await fetch('/api/check-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ external_reference: externalReference })
          })
          const data = await res.json()
          if (data.success && data.payment_confirmed) {
            if (onPaymentConfirmed) onPaymentConfirmed()
            if (pollRef.current) clearInterval(pollRef.current)
            return
          }
        }

        // Fallback: check via Supabase directly (legacy polling)
        if (whatsapp) {
          const res = await fetch('/api/check-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whatsapp })
          })
          const data = await res.json()
          if (data.success && data.payment_confirmed) {
            if (onPaymentConfirmed) onPaymentConfirmed()
            if (pollRef.current) clearInterval(pollRef.current)
            return
          }
        }
      } catch {
        // Erro silencioso no polling
      }
    }

    checkPayment()
    pollRef.current = setInterval(checkPayment, 5000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [externalReference, whatsapp, isExpired, onPaymentConfirmed])

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
    } catch {
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

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={createNewPix}
            disabled={isGenerating}
            className="mt-3 w-full btn-primary"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Tentando novamente...
              </div>
            ) : (
              'Tentar Novamente'
            )}
          </button>
        </div>
      )}

      {/* Loading */}
      {isGenerating && !error && !qrCodeImage && (
        <div className="mb-6 flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-gray-400 animate-spin" />
          <p className="text-gray-600 text-sm font-medium">Gerando QR Code de pagamento...</p>
        </div>
      )}

      {/* QR Code Image (base64 from gateway) */}
      {qrCodeImage && !error && (
        <div className="bg-white p-4 rounded-xl mb-6 mx-auto w-fit">
          <img
            src={qrCodeImage}
            alt="QR Code PIX"
            className="w-[200px] h-[200px]"
          />
        </div>
      )}

      {/* PIX Copia e Cola */}
      {pixCode && !error && (
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
      )}

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
        !error && qrCodeImage && (
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
        )
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
