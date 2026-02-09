import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  FileSearch,
  TrendingUp,
  Lock,
  PhoneCall,
  CheckCircle2,
  ChevronDown,
  Quote
} from 'lucide-react'
import { saveLead } from '../services/supabase'
import { hasConfirmedPayment } from '../services/paymentService'
import { useMetaPixel } from '../hooks/useMetaPixel'
import { useAnalytics } from '../hooks/useAnalytics'

interface FormData {
  whatsapp: string
}

const LandingPage = () => {
  const navigate = useNavigate()
  const { trackEvent } = useMetaPixel()
  const { trackEvent: trackAnalytics, trackFunnel } = useAnalytics()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    whatsapp: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState<'basic' | 'premium' | null>(null)
  const [highlightPhonePrompt, setHighlightPhonePrompt] = useState(false)
  const [alreadyPaid, setAlreadyPaid] = useState(false)
  const [discountRemoved, setDiscountRemoved] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  const discountPercent = Number(import.meta.env.VITE_PORCENTAGEM_DESCONTO) || 10

  // Rastreia visualização da landing page
  useEffect(() => {
    // Meta Pixel
    trackEvent('ViewContent', {
      content_name: 'Landing Page',
      content_category: 'Home'
    })
    
    // Analytics no banco
    trackAnalytics('page_view', 'Landing Page', '/')
    trackFunnel('landing', 1)
  }, [trackEvent, trackAnalytics, trackFunnel])

  // Verifica se o whatsapp já tem pagamento confirmado (esconder promo para quem já pagou)
  useEffect(() => {
    const whatsappDigits = formData.whatsapp.replace(/\D/g, '')
    if (whatsappDigits.length === 11) {
      hasConfirmedPayment(whatsappDigits).then(paid => {
        if (paid && !alreadyPaid) {
          setDiscountRemoved(true)
          setTimeout(() => setDiscountRemoved(false), 6000)
        }
        setAlreadyPaid(paid)
      })
    }
  }, [formData.whatsapp])

  // Função para formatar telefone brasileiro
  const formatPhoneNumber = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11)
    
    // Aplica a máscara (11) 99999-9999
    if (limited.length <= 2) {
      return limited
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
    }
  }

  // Função para validar número brasileiro
  const validatePhoneNumber = (phone: string): boolean => {
    const numbers = phone.replace(/\D/g, '')
    
    // Deve ter exatamente 11 dígitos (2 DDD + 9 celular)
    if (numbers.length !== 11) {
      return false
    }
    
    // DDD deve ser válido (11-99)
    const ddd = parseInt(numbers.slice(0, 2))
    if (ddd < 11 || ddd > 99) {
      return false
    }
    
    // Celular deve começar com 9
    const firstDigit = numbers.charAt(2)
    if (firstDigit !== '9') {
      return false
    }
    
    return true
  }

  const proceedToAnalysis = async (whatsapp: string) => {
    if (!whatsapp) {
      setPhoneError('Por favor, informe o número do WhatsApp')
      return
    }

    if (!validatePhoneNumber(whatsapp)) {
      setPhoneError('Número inválido! Use o formato (11) 99999-9999')
      return
    }

    setPhoneError('')
    setIsLoading(true)
    setHighlightPhonePrompt(false)

    const cleanWhatsapp = whatsapp.replace(/\D/g, '')
    await saveLead(cleanWhatsapp)

    trackEvent('Lead', {
      content_name: 'WhatsApp Form Submission',
      content_category: 'Lead Generation'
    })

    trackAnalytics('lead', 'Form Submission', '/', cleanWhatsapp)
    trackFunnel('form_filled', 2, cleanWhatsapp)

    const baseData: Record<string, any> = {
      ...formData,
      whatsapp: cleanWhatsapp
    }

    if (selectedPlanId) {
      const planMeta = pricingPlans.find(plan => plan.id === selectedPlanId)
      const isPromoActive = selectedPlanId === 'basic' && !alreadyPaid
      const finalPrice = isPromoActive
        ? (planMeta?.priceValue ?? priceA) * (1 - discountPercent / 100)
        : (planMeta?.priceValue ?? priceB)
      baseData.selectedPlanId = selectedPlanId
      baseData.selectedPlanPrice = finalPrice
      baseData.selectedPlanLabel = fmtBRL(finalPrice)
      baseData.selectedPlanName = planMeta?.name ?? 'Plano Vitalício'
      if (isPromoActive) {
        baseData.firstTimeDiscount = discountPercent
        baseData.originalPrice = planMeta?.priceValue ?? priceA
      }
    }

    localStorage.setItem('analysisData', JSON.stringify(baseData))

    setIsPhoneModalOpen(false)
    setTimeout(() => {
      navigate('/analise')
    }, 700)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await proceedToAnalysis(formData.whatsapp)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    if (name === 'whatsapp') {
      // Aplica a máscara e atualiza
      const formatted = formatPhoneNumber(value)
      setFormData({
        ...formData,
        [name]: formatted
      })
      
      // Limpa erro ao digitar
      if (phoneError) {
        setPhoneError('')
      }

      if (formatted.length > 0 && highlightPhonePrompt) {
        setHighlightPhonePrompt(false)
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const navLinks = [
    { label: 'Recursos', href: '#features' },
    { label: 'Como Funciona', href: '#how-it-works' },
    { label: 'Depoimentos', href: '#testimonials' },
    { label: 'Planos', href: '#pricing' },
    { label: 'FAQ', href: '#faq' }
  ]

  const featureCards = [
    {
      icon: ShieldCheck,
      title: 'Verificação Profunda',
      description: 'Nosso motor de análise cruza mensagens, mídias e padrões de comportamento para revelar evidências reais.'
    },
    {
      icon: Sparkles,
      title: 'IA Treinada',
      description: 'Modelos próprios avaliam risco de traição em segundos, destacando interações suspeitas automaticamente.'
    },
    {
      icon: Lock,
      title: 'Privacidade Blindada',
      description: 'Todo o processo acontece de forma sigilosa, com criptografia ponta a ponta e conformidade total com a LGPD.'
    }
  ]

  const steps = [
    {
      icon: PhoneCall,
      title: 'Informe o WhatsApp',
      description: 'Digite o número que deseja investigar. Aplicamos máscaras e validações automáticas para facilitar.'
    },
    {
      icon: FileSearch,
      title: 'Escaneamos Evidências',
      description: 'A Traitor AI rastreia conversas, mídias e contatos que fogem da rotina e podem indicar traição.'
    },
    {
      icon: TrendingUp,
      title: 'Pontuação de Risco',
      description: 'Geramos uma pontuação personalizada considerando recorrência, horários e linguagem utilizada.'
    },
    {
      icon: ShieldCheck,
      title: 'Relatório Seguro',
      description: 'Você recebe um dossiê completo com insights acionáveis para tomar decisões com confiança.'
    }
  ]

  const heroShowcase = {
    badge: '+15.000 pessoas confiaram na Traitor',
    image: '/images/imagem1.png',
    imageAlt: 'Duas mulheres sorrindo, representando confiança após análise da Traitor',
    trustCard: {
      label: 'Verificação segura e confidencial',
      description: 'Dados protegidos e em conformidade com LGPD',
      icon: ShieldCheck
    }
  }
  const TrustCardIcon = heroShowcase.trustCard.icon

  const missionHighlights = [
    {
      badge: 'Proteção ativa',
      title: 'Segurança Proativa',
      description: 'Diga adeus a suposições. Tenha dados verificados para tomar decisões com clareza e proteger sua paz.',
      image: '/images/imagem2.png',
      imageAlt: 'Mulher confiante olhando para a câmera'
    },
    {
      badge: 'Rede segura',
      title: 'Comunidade de Apoio',
      description: 'Você não está só. Criamos uma rede onde pessoas trocam experiências, conselhos e fortalecem relacionamentos.',
      image: '/images/imagem3.png',
      imageAlt: 'Grupo de amigas sorrindo unidas'
    },
    {
      badge: 'Dados reais',
      title: 'Informação Confiável',
      description: 'Tudo o que você vê no Traitor é baseado em dados públicos reais, checados com tecnologia proprietária.',
      image: '/images/imagem4.png',
      imageAlt: 'Mulher analisando documentos com tablet'
    }
  ]

  const testimonials = [
    {
      name: 'Sarah M.',
      location: 'São Paulo, SP',
      quote: 'A Traitor revelou conversas escondidas e padrões suspeitos. Fiquei chocada com a rapidez e precisão.',
      avatar: '/images/imagem7.png'
    },
    {
      name: 'Jéssica T.',
      location: 'Rio de Janeiro, RJ',
      quote: 'Hoje me sinto muito mais confiante para iniciar um relacionamento. A análise trouxe clareza que eu precisava.',
      avatar: '/images/imagem8.png'
    },
    {
      name: 'Michelle K.',
      location: 'Belo Horizonte, MG',
      quote: 'É minha ferramenta de confiança. Já compartilhei com todas as minhas amigas pela segurança que entrega.',
      avatar: '/images/imagem9.png'
    },
    {
      name: 'Beatriz L.',
      location: 'Brasília, DF',
      quote: 'Relatório completo, organizado e fácil de entender. Resolvi situações delicadas com respaldo total.',
      avatar: '/images/imagem10.png'
    }
  ]

  const pressArticles = [
    {
      badge: 'Economia SP',
      title: 'Traitor AI ajuda a evitar relacionamentos perigosos',
      excerpt: 'Tecnologia brasileira desenvolvida para investigar antecedentes com rapidez e sigilo absoluto.',
      date: '6 de junho, 2025',
      image: '/images/imagem5.png',
      imageAlt: 'Retrato de mulher profissional em estúdio rosa'
    },
    {
      badge: 'Núcleo Tech',
      title: 'Como a IA está transformando a segurança afetiva',
      excerpt: 'Jovens recorrem ao Traitor para verificar novas conexões e preservar relacionamentos saudáveis.',
      date: '6 de junho, 2025',
      image: '/images/imagem6.png',
      imageAlt: 'Amigas usando aplicativo em um quarto com iluminação aconchegante'
    }
  ]

  const priceA = Number(import.meta.env.VITE_PRICE_A) || 10.97
  const priceB = Number(import.meta.env.VITE_PRICE_B) || 29.97
  const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

  const pricingPlans = [
    {
      id: 'basic' as const,
      name: 'Análise Completa',
      price: fmtBRL(priceA),
      priceValue: priceA,
      tag: 'Ideal para quem quer uma confirmação imediata',
      highlight: false,
      items: [
        'Relatório completo com todas as evidências',
        'Pontuação de risco e insights acionáveis',
        'Download em PDF para guardar ou compartilhar',
        'Acesso aos dados por 7 dias'
      ]
    },
    {
      id: 'premium' as const,
      name: 'Plano Vitalício',
      price: fmtBRL(priceB),
      priceValue: priceB,
      tag: 'Investigue sempre que quiser, sem limites',
      highlight: true,
      items: [
        'Análises ilimitadas para sempre',
        'Histórico salvo com evolução do risco',
        'Alertas em tempo real de novos indícios',
        'Acesso permanente à comunidade exclusiva'
      ]
    }
  ]

  const selectedPlan = selectedPlanId
    ? pricingPlans.find(plan => plan.id === selectedPlanId)
    : undefined

  const faqItems = [
    {
      question: 'Como o Traitor coleta as informações?',
      answer: 'Usamos fontes públicas permitidas por lei, combinadas com inteligência artificial para identificar padrões que podem indicar infidelidade.'
    },
    {
      question: 'A pessoa investigada fica sabendo?',
      answer: 'Não. Todo o processo é 100% sigiloso e acontece longe dos aparelhos da pessoa analisada.'
    },
    {
      question: 'Quanto tempo leva para receber o relatório?',
      answer: 'Após confirmar o número, a análise leva poucos minutos. Você acompanha o status em tempo real e recebe o relatório imediatamente.'
    },
    {
      question: 'Meu histórico fica salvo?',
      answer: 'Sim, você pode acessar suas análises anteriores na área logada e comparar a evolução da pontuação de risco.'
    }
  ]

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    event.preventDefault()
    const element = document.querySelector(target)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleLogoClick = (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    event.preventDefault()
    setIsMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePlanSelect = (plan: typeof pricingPlans[number]) => {
    setSelectedPlanId(plan.id)
    const hasPhoneNumber = formData.whatsapp.replace(/\D/g, '').length > 0
    setHighlightPhonePrompt(!hasPhoneNumber)

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      phoneInputRef.current?.focus()
    }, 400)

    trackEvent('AddToCart', {
      content_name: plan.name,
      value: plan.priceValue,
      currency: 'BRL',
      content_category: 'Landing Plans'
    })

    trackAnalytics('plan_select', 'Landing Plan Click', '/', plan.id, {
      plan: plan.id,
      value: plan.priceValue
    })
  }

  return (
    <div className="landing-gradient min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-pink-100/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3 sm:py-5">
            <button
              type="button"
              onClick={handleLogoClick}
              className="group flex items-center gap-2 rounded-full border border-transparent bg-transparent p-1 transition focus:outline-none focus-visible:border-pink-200 focus-visible:ring-2 focus-visible:ring-pink-200/70"
              aria-label="Voltar ao início"
            >
              <img
                src="/images/logosite.png"
                alt="Logotipo Traitor AI"
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="text-xl font-semibold text-slate-900 group-hover:text-pink-600 transition-colors">Traitor AI</span>
            </button>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(event) => handleNavClick(event, link.href)}
                  className="relative group"
                >
                  {link.label}
                  <span className="absolute left-0 -bottom-1 h-0.5 w-0 bg-pink-500 transition-all group-hover:w-full" />
                </a>
              ))}
            </nav>

            <div className="hidden md:flex min-w-[180px]" aria-hidden="true"></div>

            <button
              className="md:hidden p-2 rounded-full border border-pink-200 text-pink-600"
              onClick={() => setIsMenuOpen(prev => !prev)}
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden pb-6">
              <nav className="flex flex-col gap-4 text-slate-700">
                {navLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(event) => handleNavClick(event, link.href)}
                    className="py-2 border-b border-pink-100"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main>
        <section id="hero" className="relative overflow-hidden">
          <div className="container mx-auto px-4 py-10 sm:py-20">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-5 sm:space-y-8">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-0.5 text-xs font-semibold text-pink-600 sm:gap-2 sm:px-4 sm:py-1 sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Inteligência artificial para relações mais seguras
                </span>
                <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-4xl md:text-5xl">
                  Relações de confiança começam com <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">informação real</span>.
                </h1>
                <p className="text-sm text-slate-600 sm:text-lg md:text-xl">
                  Com o Traitor, você descobre em minutos se existe traição. Nossa IA investiga conversas, mídias e contatos para entregar um relatório completo e confidencial.
                </p>

                <form ref={formRef} onSubmit={handleSubmit} className="rounded-2xl bg-white p-4 shadow-2xl shadow-pink-100/70 border border-pink-100 sm:rounded-3xl sm:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-xs font-semibold text-slate-700 sm:text-sm">
                          Informe o WhatsApp a ser analisado
                        </label>
                        {highlightPhonePrompt && !formData.whatsapp && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600">
                            <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse"></span>
                            Insira o número para análise!
                          </span>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition focus-within:border-pink-400 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 ${
                          phoneError
                            ? 'border-red-400 ring-2 ring-red-200'
                            : highlightPhonePrompt && !formData.whatsapp
                              ? 'border-pink-400 ring-2 ring-pink-200 shadow-[0_0_0_4px_rgba(244,114,182,0.25)]'
                              : 'border-slate-200'
                        }`}
                      >
                        <PhoneCall className={`w-4 h-4 sm:w-5 sm:h-5 ${phoneError ? 'text-red-400' : 'text-pink-500'}`} />
                        <input
                          type="tel"
                          name="whatsapp"
                          value={formData.whatsapp}
                          onChange={handleInputChange}
                          placeholder="(11) 99999-9999"
                          maxLength={15}
                          className="w-full bg-transparent text-sm text-slate-800 outline-none sm:text-base"
                          ref={phoneInputRef}
                          required
                        />
                      </div>
                      {phoneError ? (
                        <p className="mt-1.5 text-xs font-medium text-red-500 sm:mt-2 sm:text-sm">{phoneError}</p>
                      ) : (
                        <p className="mt-1.5 text-[10px] text-slate-500 sm:mt-2 sm:text-xs">Nenhuma mensagem será enviada. Usamos o número apenas para gerar o relatório.</p>
                      )}
                      {discountRemoved && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 sm:text-sm">
                          <span className="text-base">⚠️</span>
                          <span>O desconto de <strong>{discountPercent}%</strong> foi removido pois este número já realizou uma compra anteriormente.</span>
                        </div>
                      )}
                      {selectedPlan && (() => {
                        const isPromo = selectedPlan.id === 'basic' && !alreadyPaid
                        const finalPrice = isPromo
                          ? selectedPlan.priceValue * (1 - discountPercent / 100)
                          : selectedPlan.priceValue
                        return (
                          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-pink-100 bg-pink-50/80 px-4 py-2 text-sm text-pink-600">
                            <span className="font-semibold uppercase tracking-[0.18em] text-pink-500">Plano escolhido</span>
                            <span className="font-semibold text-pink-600">{selectedPlan.name}</span>
                            {isPromo ? (
                              <>
                                <span className="text-pink-300 line-through text-xs">— {selectedPlan.price}</span>
                                <span className="font-bold text-rose-600">— {fmtBRL(finalPrice)}</span>
                                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">-{discountPercent}%</span>
                              </>
                            ) : (
                              <span className="text-pink-500">— {selectedPlan.price}</span>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-gradient h-11 px-6 text-sm font-semibold sm:h-[52px] sm:px-8 sm:text-base md:flex-none"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Processando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Iniciar análise
                          <ArrowRight className="w-5 h-5" />
                        </span>
                      )}
                    </button>
                  </div>
                </form>

                <div className="grid gap-2.5 sm:gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-pink-100 bg-white/80 p-3 text-xs text-slate-600 shadow-sm sm:rounded-2xl sm:p-4 sm:text-sm">
                    <div className="flex items-center gap-1.5 text-pink-600 font-semibold sm:gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      +15.000
                    </div>
                    Pessoas que confiam na Traitor AI
                  </div>
                  <div className="rounded-xl border border-pink-100 bg-white/80 p-3 text-xs text-slate-600 shadow-sm sm:rounded-2xl sm:p-4 sm:text-sm">
                    <div className="flex items-center gap-1.5 text-pink-600 font-semibold sm:gap-2">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      92%
                    </div>
                    Acurácia média na identificação de riscos
                  </div>
                  <div className="rounded-xl border border-pink-100 bg-white/80 p-3 text-xs text-slate-600 shadow-sm sm:rounded-2xl sm:p-4 sm:text-sm">
                    <div className="flex items-center gap-1.5 text-pink-600 font-semibold sm:gap-2">
                      <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      100%
                    </div>
                    Processos sigilosos e em conformidade com a LGPD
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="relative overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-2xl sm:rounded-[36px]">
                  <div className="absolute -left-4 top-4 rounded-full bg-pink-500 px-4 py-1.5 text-[10px] font-semibold text-white shadow-lg sm:-left-6 sm:top-6 sm:px-6 sm:py-2 sm:text-sm">
                    {heroShowcase.badge}
                  </div>
                  <img
                    src={heroShowcase.image}
                    alt={heroShowcase.imageAlt}
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/50 bg-white/85 p-3 shadow-xl backdrop-blur sm:bottom-6 sm:left-6 sm:right-6 sm:rounded-3xl sm:p-5">
                    <div className="flex items-center gap-2 text-pink-600 sm:gap-3">
                      <TrustCardIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] sm:text-sm sm:tracking-[0.25em]">{heroShowcase.trustCard.label}</p>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-600 sm:mt-2 sm:text-sm">{heroShowcase.trustCard.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section-wrapper">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-2 max-w-3xl mx-auto sm:space-y-4">
              <span className="section-subtitle">Recursos</span>
              <h2 className="section-title">Tecnologia pensada para revelar a verdade sem ruídos.</h2>
              <p className="section-description">
                Combine inteligência artificial, análise comportamental e relatórios claros para tomar decisões informadas sobre o seu relacionamento.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:mt-12 sm:gap-6 md:grid-cols-3">
              {featureCards.map(({ icon: Icon, title, description }) => (
                <div key={title} className="card-surface">
                  <div className="feature-icon">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
                  <p className="text-xs text-slate-600 sm:text-sm">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-wrapper bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-2 max-w-3xl mx-auto sm:space-y-4">
              <span className="section-subtitle">Como Funciona</span>
              <h2 className="section-title">Do número ao relatório em minutos.</h2>
              <p className="section-description">
                Em quatro etapas simples você descobre se existe traição e recebe um relatório detalhado para agir com confiança.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-6 md:grid-cols-4">
              {steps.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="group relative overflow-hidden rounded-xl border border-pink-100/70 bg-white shadow-lg shadow-pink-100/40 transition-transform duration-300 hover:-translate-y-1 sm:rounded-[28px]"
                >
                  <div className="pointer-events-none absolute -left-8 top-0 h-24 w-24 rounded-full bg-pink-100/70 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="space-y-2 p-3.5 sm:space-y-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-pink-500 shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl">
                        <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <h3 className="text-sm font-semibold text-slate-900 sm:text-lg">{title}</h3>
                      <p className="text-[11px] text-slate-600 leading-relaxed sm:text-sm">{description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrapper">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-2 max-w-3xl mx-auto sm:space-y-4">
              <span className="section-subtitle">Nossa Missão</span>
              <h2 className="section-title">Protegemos quem não pode viver com dúvidas.</h2>
              <p className="section-description">
                Traitor nasceu para oferecer transparência emocional com tecnologia responsável. Você merece saber com quem está se relacionando.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:mt-12 sm:gap-6 md:grid-cols-3">
              {missionHighlights.map(({ badge, title, description, image, imageAlt }) => (
                <article key={title} className="group overflow-hidden rounded-xl border border-pink-100/80 bg-white shadow-xl shadow-pink-100/40 transition-transform duration-300 hover:-translate-y-1 sm:rounded-[28px]">
                  <div className="relative h-32 overflow-hidden sm:h-48">
                    <img src={image} alt={imageAlt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-pink-600 shadow sm:left-5 sm:top-5 sm:px-4 sm:py-1 sm:text-xs sm:tracking-[0.25em]">{badge}</span>
                  </div>
                  <div className="space-y-1.5 p-4 sm:space-y-3 sm:p-6">
                    <h3 className="text-sm font-semibold text-slate-900 sm:text-lg">{title}</h3>
                    <p className="text-xs text-slate-600 sm:text-sm">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrapper bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="rounded-2xl bg-white p-5 shadow-2xl border border-pink-100 sm:rounded-[32px] sm:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 sm:text-2xl">Faça sua análise e tire a dúvida agora.</h3>
                  <p className="mt-1 text-xs text-slate-600 max-w-xl sm:mt-2 sm:text-base">
                    Insira o WhatsApp e deixe a Traitor AI investigar de forma anônima. Resultado liberado após o pagamento.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-gradient"
                  onClick={() => {
                    setPhoneError('')
                    setIsPhoneModalOpen(true)
                  }}
                >
                  Faça sua Análise Agora
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:mt-10 sm:gap-6 md:grid-cols-2">
                {pressArticles.map(article => (
                  <article key={article.title} className="overflow-hidden rounded-xl border border-pink-100 bg-pink-50/60 shadow-sm sm:rounded-[26px]">
                    <div className="relative h-32 overflow-hidden sm:h-48">
                      <img src={article.image} alt={article.imageAlt} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                      <span className="absolute left-5 top-5 rounded-full bg-white/85 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-pink-600 shadow">{article.badge}</span>
                    </div>
                    <div className="space-y-1.5 p-3.5 sm:space-y-3 sm:p-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:text-xs sm:tracking-[0.2em]">{article.date}</p>
                      <h4 className="text-sm font-semibold text-slate-900 sm:text-lg">{article.title}</h4>
                      <p className="text-xs text-slate-600 sm:text-sm">{article.excerpt}</p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-pink-600"
                        onClick={() => {
                          setPhoneError('')
                          setIsPhoneModalOpen(true)
                        }}
                      >
                        Fazer análise agora
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {isPhoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/50"
              onClick={() => {
                setIsPhoneModalOpen(false)
              }}
              aria-label="Fechar"
            />
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-pink-100 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Faça sua Análise Agora</h3>
                  <p className="mt-1 text-sm text-slate-600">Digite o WhatsApp que você quer analisar.</p>
                </div>
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                  onClick={() => {
                    setIsPhoneModalOpen(false)
                  }}
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    WhatsApp
                  </label>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    className="w-full rounded-2xl border border-pink-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                    inputMode="numeric"
                  />
                  {phoneError && <p className="mt-2 text-sm font-medium text-rose-600">{phoneError}</p>}
                  {discountRemoved && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <span>⚠️</span>
                      <span>O desconto de <strong>{discountPercent}%</strong> foi removido pois este número já realizou uma compra anteriormente.</span>
                    </div>
                  )}
                  {selectedPlan && !discountRemoved && (() => {
                    const isPromo = selectedPlan.id === 'basic' && !alreadyPaid
                    const finalPrice = isPromo
                      ? selectedPlan.priceValue * (1 - discountPercent / 100)
                      : selectedPlan.priceValue
                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-pink-100 bg-pink-50/80 px-3 py-1.5 text-xs text-pink-600">
                        <span className="font-semibold">{selectedPlan.name}</span>
                        {isPromo ? (
                          <>
                            <span className="text-pink-300 line-through">— {selectedPlan.price}</span>
                            <span className="font-bold text-rose-600">— {fmtBRL(finalPrice)}</span>
                            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">-{discountPercent}%</span>
                          </>
                        ) : (
                          <span className="text-pink-500">— {selectedPlan.price}</span>
                        )}
                      </div>
                    )
                  })()}
                </div>

                <button
                  type="button"
                  className="btn-gradient w-full"
                  onClick={() => {
                    void proceedToAnalysis(formData.whatsapp)
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Iniciando...' : 'Iniciar análise'}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Análise 100% anônima e segura.
                </p>
              </div>
            </div>
          </div>
        )}

        <section id="testimonials" className="section-wrapper">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-2 max-w-3xl mx-auto sm:space-y-4">
              <span className="section-subtitle">Depoimentos</span>
              <h2 className="section-title">Histórias reais de quem encontrou respostas.</h2>
            </div>

            <div className="mt-6 grid gap-3 sm:mt-12 sm:gap-6 md:grid-cols-2">
              {testimonials.map(({ name, location, quote, avatar }) => (
                <div key={name} className="flex flex-col gap-3 rounded-xl border border-pink-100 bg-white/95 p-4 shadow-lg shadow-pink-100/40 sm:gap-5 sm:rounded-[28px] sm:p-8">
                  <Quote className="h-4 w-4 text-pink-400 sm:h-6 sm:w-6" />
                  <p className="text-xs text-slate-700 leading-relaxed sm:text-base">"{quote}"</p>
                  <div className="flex items-center gap-3 sm:mt-2 sm:gap-4">
                    <img src={avatar} alt={name} className="h-9 w-9 rounded-full object-cover sm:h-12 sm:w-12" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      <p className="text-[10px] text-slate-500 sm:text-sm">{location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="section-wrapper bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-2 max-w-3xl mx-auto sm:space-y-4">
              <span className="section-subtitle">Planos</span>
              <h2 className="section-title">Escolha como você quer investigar.</h2>
              <p className="section-description">
                Acesso imediato após o pagamento, com possibilidade de upgrade a qualquer momento.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2 md:items-stretch">
              {pricingPlans.map(plan => {
                const isSelected = selectedPlanId === plan.id
                const showPromo = plan.id === 'basic' && !alreadyPaid
                const discountedPrice = showPromo
                  ? plan.priceValue * (1 - discountPercent / 100)
                  : plan.priceValue
                return (
                  <div
                    key={plan.id}
                    className={`pricing-card relative overflow-hidden ${plan.highlight ? 'pricing-card-highlight' : ''} ${
                      isSelected ? 'ring-2 ring-pink-200 border-pink-200 shadow-xl shadow-pink-200/60' : ''
                    }`}
                  >
                    {showPromo && (
                      <div className="absolute -right-8 top-4 rotate-[35deg] bg-gradient-to-r from-rose-500 to-pink-500 px-10 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow-lg sm:top-5 sm:text-[10px]">
                        {discountPercent}% OFF
                      </div>
                    )}
                    <div className="flex h-6 items-center sm:h-8">
                      {plan.highlight ? (
                        <span className="badge-soft text-[10px] sm:text-xs">Mais Popular</span>
                      ) : showPromo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow sm:px-3 sm:py-1 sm:text-xs">
                          🔥 Primeira análise com desconto!
                        </span>
                      ) : (
                        <span className="badge-soft invisible opacity-0 text-[10px] sm:text-xs">-</span>
                      )}
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900 sm:text-2xl">{plan.name}</h3>
                      <p className="text-xs text-pink-600 font-medium sm:text-sm">{plan.tag}</p>
                      {showPromo ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 line-through sm:text-sm">De: {plan.price}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-rose-600 sm:text-3xl">Por: {fmtBRL(discountedPrice)}</span>
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 sm:text-xs">-{discountPercent}%</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{plan.price}</p>
                      )}
                    </div>
                    <ul className="space-y-2 text-xs text-slate-600 sm:space-y-3 sm:text-sm">
                      {plan.items.map(item => (
                        <li key={item} className="flex items-start gap-2 sm:gap-3">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-pink-500 sm:mt-1 sm:h-4 sm:w-4" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      <button
                        type="button"
                        className={`btn-gradient w-full text-sm transition sm:text-base ${isSelected ? 'ring-2 ring-white/70 shadow-lg shadow-pink-200/70' : ''}`}
                        onClick={() => handlePlanSelect(plan)}
                        aria-pressed={isSelected}
                      >
                        {isSelected ? 'Plano escolhido' : 'Quero esse plano'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="section-wrapper">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-2 max-w-3xl mx-auto sm:space-y-4">
              <span className="section-subtitle">Perguntas Frequentes</span>
              <h2 className="section-title">Tudo o que você precisa saber antes de investigar.</h2>
            </div>

            <div className="mt-6 mx-auto max-w-3xl space-y-2.5 sm:mt-12 sm:space-y-4">
              {faqItems.map((item, index) => {
                const isOpen = openFaq === index
                return (
                  <div key={item.question} className="rounded-xl border border-pink-100 bg-white shadow-sm overflow-hidden sm:rounded-2xl">
                    <button
                      className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-6 sm:py-4"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                    >
                      <span className="text-sm font-semibold text-slate-900 sm:text-base">{item.question}</span>
                      <ChevronDown className={`h-4 w-4 flex-shrink-0 text-pink-500 transition-transform sm:h-5 sm:w-5 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-pink-50 bg-pink-50/40 px-4 py-3 text-xs text-slate-600 sm:px-6 sm:py-4 sm:text-sm">
                        {item.answer}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-100">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleLogoClick}
                className="flex items-center gap-3 rounded-full border border-transparent bg-transparent p-1 text-left transition focus:outline-none focus-visible:border-pink-200 focus-visible:ring-2 focus-visible:ring-pink-200/70"
                aria-label="Voltar ao início"
              >
                <img
                  src="/images/logosite.png"
                  alt="Logotipo Traitor AI"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <span className="text-lg font-semibold">Traitor AI</span>
              </button>
              <p className="text-sm text-slate-300">
                Transparência para quem não aceita viver na incerteza. Relacionamentos confiáveis começam com informação.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">Produto</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li><a href="#features" onClick={(event) => handleNavClick(event, '#features')} className="hover:text-white">Recursos</a></li>
                <li><a href="#how-it-works" onClick={(event) => handleNavClick(event, '#how-it-works')} className="hover:text-white">Como Funciona</a></li>
                <li><a href="#pricing" onClick={(event) => handleNavClick(event, '#pricing')} className="hover:text-white">Planos</a></li>
                <li><a href="#faq" onClick={(event) => handleNavClick(event, '#faq')} className="hover:text-white">Perguntas Frequentes</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">Contato</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Suporte: suporte@traitor.ai</li>
                <li>Imprensa: press@traitor.ai</li>
                <li>Parcerias: parceiros@traitor.ai</li>
                <li>© {new Date().getFullYear()} Traitor AI</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
            <p>Construído com tecnologia brasileira e inteligência artificial própria.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
