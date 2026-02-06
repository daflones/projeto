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
  const [formData, setFormData] = useState<FormData>({
    whatsapp: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState<'basic' | 'premium' | null>(null)
  const [highlightPhonePrompt, setHighlightPhonePrompt] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.whatsapp) {
      setPhoneError('Por favor, informe o número do WhatsApp')
      return
    }

    if (!validatePhoneNumber(formData.whatsapp)) {
      setPhoneError('Número inválido! Use o formato (11) 99999-9999')
      return
    }

    setPhoneError('')
    setIsLoading(true)
    setHighlightPhonePrompt(false)

    // Salvar lead no banco de dados
    const cleanWhatsapp = formData.whatsapp.replace(/\D/g, '')
    await saveLead(cleanWhatsapp)
    
    // Rastreia evento de Lead (formulário preenchido)
    // Meta Pixel
    trackEvent('Lead', {
      content_name: 'WhatsApp Form Submission',
      content_category: 'Lead Generation'
    })
    
    // Analytics no banco
    trackAnalytics('lead', 'Form Submission', '/', cleanWhatsapp)
    trackFunnel('form_filled', 2, cleanWhatsapp)
    
    // Salvar dados no localStorage para usar nas próximas páginas
    const baseData: Record<string, any> = {
      ...formData,
      whatsapp: cleanWhatsapp
    }

    if (selectedPlanId) {
      const planMeta = pricingPlans.find(plan => plan.id === selectedPlanId)
      baseData.selectedPlanId = selectedPlanId
      baseData.selectedPlanPrice = planMeta?.priceValue ?? 49.99
      baseData.selectedPlanLabel = planMeta?.price ?? 'R$ 49,99'
      baseData.selectedPlanName = planMeta?.name ?? 'Plano Vitalício'
    }

    localStorage.setItem('analysisData', JSON.stringify(baseData))
    
    // Simular um pequeno delay para parecer mais real
    setTimeout(() => {
      navigate('/analise')
    }, 1500)
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

  const pricingPlans = [
    {
      id: 'basic' as const,
      name: 'Análise Completa',
      price: 'R$ 10,00',
      priceValue: 10,
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
      price: 'R$ 49,99',
      priceValue: 49.99,
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
          <div className="flex items-center justify-between py-5">
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
          <div className="container mx-auto px-4 py-20">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="space-y-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-1 text-sm font-semibold text-pink-600">
                  <Sparkles className="w-4 h-4" /> Inteligência artificial para relações mais seguras
                </span>
                <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
                  Relações de confiança começam com <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">informação real</span>.
                </h1>
                <p className="text-lg text-slate-600 md:text-xl">
                  Com o Traitor, você descobre em minutos se existe traição. Nossa IA investiga conversas, mídias e contatos para entregar um relatório completo e confidencial.
                </p>

                <form ref={formRef} onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-2xl shadow-pink-100/70 border border-pink-100">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-sm font-semibold text-slate-700">
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
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition focus-within:border-pink-400 ${
                          phoneError
                            ? 'border-red-400 ring-2 ring-red-200'
                            : highlightPhonePrompt && !formData.whatsapp
                              ? 'border-pink-400 ring-2 ring-pink-200 shadow-[0_0_0_4px_rgba(244,114,182,0.25)]'
                              : 'border-slate-200'
                        }`}
                      >
                        <PhoneCall className={`w-5 h-5 ${phoneError ? 'text-red-400' : 'text-pink-500'}`} />
                        <input
                          type="tel"
                          name="whatsapp"
                          value={formData.whatsapp}
                          onChange={handleInputChange}
                          placeholder="(11) 99999-9999"
                          maxLength={15}
                          className="w-full bg-transparent text-base text-slate-800 outline-none"
                          ref={phoneInputRef}
                          required
                        />
                      </div>
                      {phoneError ? (
                        <p className="mt-2 text-sm font-medium text-red-500">{phoneError}</p>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Nenhuma mensagem será enviada. Usamos o número apenas para gerar o relatório.</p>
                      )}
                      {selectedPlan && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-pink-100 bg-pink-50/80 px-4 py-2 text-sm text-pink-600">
                          <span className="font-semibold uppercase tracking-[0.18em] text-pink-500">Plano escolhido</span>
                          <span className="font-semibold text-pink-600">{selectedPlan.name}</span>
                          <span className="text-pink-500">— {selectedPlan.price}</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-gradient h-[52px] px-8 text-base font-semibold md:flex-none"
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

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-pink-100 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
                    <div className="flex items-center gap-2 text-pink-600 font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      +15.000
                    </div>
                    Pessoas que confiam na Traitor AI
                  </div>
                  <div className="rounded-2xl border border-pink-100 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
                    <div className="flex items-center gap-2 text-pink-600 font-semibold">
                      <TrendingUp className="w-4 h-4" />
                      92%
                    </div>
                    Acurácia média na identificação de riscos
                  </div>
                  <div className="rounded-2xl border border-pink-100 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
                    <div className="flex items-center gap-2 text-pink-600 font-semibold">
                      <Lock className="w-4 h-4" />
                      100%
                    </div>
                    Processos sigilosos e em conformidade com a LGPD
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="relative overflow-hidden rounded-[36px] border border-pink-100/80 bg-white shadow-2xl">
                  <div className="absolute -left-6 top-6 rounded-full bg-pink-500 px-6 py-2 text-sm font-semibold text-white shadow-lg">
                    {heroShowcase.badge}
                  </div>
                  <img
                    src={heroShowcase.image}
                    alt={heroShowcase.imageAlt}
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />

                  <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-white/50 bg-white/85 p-5 shadow-xl backdrop-blur">
                    <div className="flex items-center gap-3 text-pink-600">
                      <TrustCardIcon className="h-5 w-5" />
                      <p className="text-sm font-semibold uppercase tracking-[0.25em]">{heroShowcase.trustCard.label}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{heroShowcase.trustCard.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section-wrapper">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="section-subtitle">Recursos</span>
              <h2 className="section-title">Tecnologia pensada para revelar a verdade sem ruídos.</h2>
              <p className="section-description">
                Combine inteligência artificial, análise comportamental e relatórios claros para tomar decisões informadas sobre o seu relacionamento.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {featureCards.map(({ icon: Icon, title, description }) => (
                <div key={title} className="card-surface">
                  <div className="feature-icon">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-wrapper bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="section-subtitle">Como Funciona</span>
              <h2 className="section-title">Do número ao relatório em minutos.</h2>
              <p className="section-description">
                Em quatro etapas simples você descobre se existe traição e recebe um relatório detalhado para agir com confiança.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {steps.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="group relative overflow-hidden rounded-[28px] border border-pink-100/70 bg-white shadow-lg shadow-pink-100/40 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="pointer-events-none absolute -left-8 top-0 h-24 w-24 rounded-full bg-pink-100/70 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="space-y-4 p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-pink-500 shadow-sm">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrapper">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="section-subtitle">Nossa Missão</span>
              <h2 className="section-title">Protegemos quem não pode viver com dúvidas.</h2>
              <p className="section-description">
                Traitor nasceu para oferecer transparência emocional com tecnologia responsável. Você merece saber com quem está se relacionando.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {missionHighlights.map(({ badge, title, description, image, imageAlt }) => (
                <article key={title} className="group overflow-hidden rounded-[28px] border border-pink-100/80 bg-white shadow-xl shadow-pink-100/40 transition-transform duration-300 hover:-translate-y-1">
                  <div className="relative h-48 overflow-hidden">
                    <img src={image} alt={imageAlt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute left-5 top-5 rounded-full bg-white/85 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-pink-600 shadow">{badge}</span>
                  </div>
                  <div className="space-y-3 p-6">
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-600">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrapper bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="rounded-[32px] bg-white p-10 shadow-2xl border border-pink-100">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">O reconhecimento do nosso impacto.</h3>
                  <p className="mt-2 text-slate-600 max-w-xl">
                    Veja como a Traitor AI está transformando a segurança relacional e ganhando espaço nos principais veículos do país.
                  </p>
                </div>
                <button className="btn-gradient">
                  Quero fazer parte
                </button>
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {pressArticles.map(article => (
                  <article key={article.title} className="overflow-hidden rounded-[26px] border border-pink-100 bg-pink-50/60 shadow-sm">
                    <div className="relative h-48 overflow-hidden">
                      <img src={article.image} alt={article.imageAlt} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                      <span className="absolute left-5 top-5 rounded-full bg-white/85 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-pink-600 shadow">{article.badge}</span>
                    </div>
                    <div className="space-y-3 p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{article.date}</p>
                      <h4 className="text-lg font-semibold text-slate-900">{article.title}</h4>
                      <p className="text-sm text-slate-600">{article.excerpt}</p>
                      <button className="inline-flex items-center gap-2 text-sm font-semibold text-pink-600">
                        Ler matéria completa
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="section-wrapper">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="section-subtitle">Depoimentos</span>
              <h2 className="section-title">Histórias reais de quem encontrou respostas.</h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {testimonials.map(({ name, location, quote, avatar }) => (
                <div key={name} className="flex flex-col gap-5 rounded-[28px] border border-pink-100 bg-white/95 p-8 shadow-lg shadow-pink-100/40">
                  <Quote className="h-6 w-6 text-pink-400" />
                  <p className="text-base text-slate-700 leading-relaxed">“{quote}”</p>
                  <div className="mt-2 flex items-center gap-4">
                    <img src={avatar} alt={name} className="h-12 w-12 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-slate-900">{name}</p>
                      <p className="text-sm text-slate-500">{location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="section-wrapper bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="section-subtitle">Planos</span>
              <h2 className="section-title">Escolha como você quer investigar.</h2>
              <p className="section-description">
                Acesso imediato após o pagamento, com possibilidade de upgrade a qualquer momento.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 md:items-stretch">
              {pricingPlans.map(plan => {
                const isSelected = selectedPlanId === plan.id
                return (
                  <div
                    key={plan.id}
                    className={`pricing-card ${plan.highlight ? 'pricing-card-highlight' : ''} ${
                      isSelected ? 'ring-2 ring-pink-200 border-pink-200 shadow-xl shadow-pink-200/60' : ''
                    }`}
                  >
                    <div className="flex h-8 items-center">
                      <span className={`badge-soft ${plan.highlight ? '' : 'invisible opacity-0'}`}>Mais Popular</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold text-slate-900">{plan.name}</h3>
                      <p className="text-sm text-pink-600 font-medium">{plan.tag}</p>
                      <p className="text-3xl font-bold text-slate-900">{plan.price}</p>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-600">
                      {plan.items.map(item => (
                        <li key={item} className="flex items-start gap-3">
                          <CheckCircle2 className="mt-1 h-4 w-4 text-pink-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      <button
                        type="button"
                        className={`btn-gradient w-full transition ${isSelected ? 'ring-2 ring-white/70 shadow-lg shadow-pink-200/70' : ''}`}
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
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="section-subtitle">Perguntas Frequentes</span>
              <h2 className="section-title">Tudo o que você precisa saber antes de investigar.</h2>
            </div>

            <div className="mt-12 mx-auto max-w-3xl space-y-4">
              {faqItems.map((item, index) => {
                const isOpen = openFaq === index
                return (
                  <div key={item.question} className="rounded-2xl border border-pink-100 bg-white shadow-sm overflow-hidden">
                    <button
                      className="flex w-full items-center justify-between px-6 py-4 text-left"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                    >
                      <span className="font-semibold text-slate-900">{item.question}</span>
                      <ChevronDown className={`h-5 w-5 text-pink-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-pink-50 bg-pink-50/40 px-6 py-4 text-sm text-slate-600">
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
          <div className="grid gap-10 md:grid-cols-4">
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
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">Institucional</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li><span className="hover:text-white">Sobre nós</span></li>
                <li><span className="hover:text-white">Política de Privacidade</span></li>
                <li><span className="hover:text-white">Termos de Uso</span></li>
                <li><span className="hover:text-white">LGPD</span></li>
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
