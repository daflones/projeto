 import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Image,
  MessageCircle,
  Phone,
  Shield,
  Sparkles,
  Users
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMetaPixel } from '../hooks/useMetaPixel'

type SectionKey = 'overview' | 'messages' | 'contacts' | 'media' | 'recommendations'

interface SuspiciousContact {
  name: string
  number: string
  risk: string
}

interface MediaAnalysis {
  photos: number
  videos: number
  deletedMedia: number
}

interface FinalResults {
  riskScore: number
  riskLevel: 'high' | 'medium' | 'low' | string
  detailedMessages: string[]
  suspiciousContacts: SuspiciousContact[]
  mediaAnalysis: MediaAnalysis
  recommendations: string[]
}

type PlanId = 'basic' | 'premium'

interface AnalysisData {
  whatsapp: string
  nome?: string
  selectedPlanId?: PlanId
  email?: string
}

interface SectionConfig {
  id: SectionKey
  label: string
  description: string
  icon: LucideIcon
}

const SECTION_CONFIG: SectionConfig[] = [
  {
    id: 'overview',
    label: 'Resumo geral',
    description: 'Panorama da análise e nível de risco',
    icon: Sparkles
  },
  {
    id: 'messages',
    label: 'Mensagens suspeitas',
    description: 'Conversas que chamaram atenção na auditoria',
    icon: MessageCircle
  },
  {
    id: 'contacts',
    label: 'Contatos suspeitos',
    description: 'Pessoas envolvidas em interações críticas',
    icon: Users
  },
  {
    id: 'media',
    label: 'Mídias e arquivos',
    description: 'Fotos, vídeos e itens deletados encontrados',
    icon: Image
  },
  {
    id: 'recommendations',
    label: 'Próximos passos',
    description: 'Orientações estratégicas após a análise',
    icon: CheckCircle
  }
]

const riskLabel = (level: string) => {
  switch (level) {
    case 'high':
      return 'Alto risco'
    case 'medium':
      return 'Risco moderado'
    default:
      return 'Baixo risco'
  }
}

const OVERLAY_POSITIONS = [
  '-left-32 top-12 h-60 w-60',
  'right-0 top-40 h-64 w-64',
  '-bottom-16 left-1/4 h-72 w-72'
]

const OVERLAY_BLURS = ['blur-[140px]', 'blur-[160px]', 'blur-[180px]']

const planLabel = (planId?: PlanId) => {
  if (planId === 'premium') return 'Plano Vitalício'
  if (planId === 'basic') return 'Análise Completa'
  return 'Plano não informado'
}

const PLAN_THEMES: Record<PlanId, {
  pageBackground: string
  overlayBlobs: string[]
  sidebarBadge: string
  navActive: string
  navInactive: string
  exportHover: string
  exportTag: string
  hintCard: string
  hintText: string
  heroChip: string
  heroStatCard: string
  heroAccentText: string
  heroBadge: string
  heroProgressGradient: { high: string; medium: string; low: string }
  statCard: string
  statLabel: string
  messageCard: string
  messageBadge: string
  messagePill: string
  sectionBadgeMessages: string
  sectionBadgeContacts: string
  sectionBadgeMedia: string
  sectionBadgeRecommendations: string
  recommendationCard: string
  calloutSection: string
  calloutButton: string
  calloutButtonIcon: string
  planSpotlight: string
  planSpotlightAccent: string
  planSpotlightTag: string
}> = {
  basic: {
    pageBackground: 'bg-gradient-to-br from-sky-50 via-white to-slate-100 text-slate-900',
    overlayBlobs: ['bg-sky-200/40', 'bg-cyan-100/40', 'bg-emerald-100/40'],
    sidebarBadge: 'border-sky-200 bg-sky-50 text-sky-700',
    navActive: 'border-sky-300 bg-white text-sky-700 shadow-sm shadow-sky-200/60',
    navInactive: 'border-transparent bg-transparent text-slate-500 hover:border-sky-200 hover:bg-white/80 hover:text-slate-900',
    exportHover: 'hover:border-sky-200 hover:bg-white/90',
    exportTag: 'text-sky-600',
    hintCard: 'border-sky-100 bg-sky-50 text-sky-700',
    hintText: 'text-sky-700',
    heroChip: 'border-sky-200 bg-white text-slate-600',
    heroStatCard: 'border-sky-100 bg-white text-slate-600',
    heroAccentText: 'text-sky-700',
    heroBadge: 'bg-sky-100 text-sky-700',
    heroProgressGradient: {
      high: 'from-rose-400 via-rose-500 to-rose-600',
      medium: 'from-amber-400 via-amber-500 to-orange-500',
      low: 'from-emerald-400 via-teal-400 to-sky-500'
    },
    statCard: 'border-slate-200 bg-white',
    statLabel: 'text-slate-500',
    messageCard: 'border-sky-100 bg-white',
    messageBadge: 'border-sky-200 bg-sky-50 text-sky-700',
    messagePill: 'border-sky-200 bg-sky-100 text-sky-700',
    sectionBadgeMessages: 'border-sky-200 bg-sky-50 text-sky-700',
    sectionBadgeContacts: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    sectionBadgeMedia: 'border-amber-200 bg-amber-50 text-amber-700',
    sectionBadgeRecommendations: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    recommendationCard: 'border-emerald-100 bg-white',
    calloutSection: 'border-slate-200 bg-white',
    calloutButton: 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-200/70',
    calloutButtonIcon: 'text-sky-600',
    planSpotlight: 'border-sky-100 bg-white',
    planSpotlightAccent: 'text-sky-700',
    planSpotlightTag: 'bg-sky-100 text-sky-700'
  },
  premium: {
    pageBackground: 'bg-gradient-to-br from-amber-50 via-white to-stone-100 text-slate-900',
    overlayBlobs: ['bg-amber-200/40', 'bg-rose-100/40', 'bg-amber-100/30'],
    sidebarBadge: 'border-amber-200 bg-amber-50 text-amber-700',
    navActive: 'border-amber-300 bg-white text-amber-700 shadow-sm shadow-amber-200/60',
    navInactive: 'border-transparent bg-transparent text-slate-500 hover:border-amber-200 hover:bg-white/80 hover:text-slate-900',
    exportHover: 'hover:border-amber-200 hover:bg-white/90',
    exportTag: 'text-amber-600',
    hintCard: 'border-amber-100 bg-amber-50 text-amber-700',
    hintText: 'text-amber-700',
    heroChip: 'border-amber-200 bg-white text-stone-600',
    heroStatCard: 'border-amber-100 bg-white text-stone-600',
    heroAccentText: 'text-amber-700',
    heroBadge: 'bg-amber-100 text-amber-700',
    heroProgressGradient: {
      high: 'from-amber-500 via-orange-500 to-amber-600',
      medium: 'from-amber-400 via-amber-500 to-rose-500',
      low: 'from-emerald-400 via-amber-400 to-orange-400'
    },
    statCard: 'border-stone-200 bg-white',
    statLabel: 'text-stone-500',
    messageCard: 'border-amber-100 bg-white',
    messageBadge: 'border-amber-200 bg-amber-50 text-amber-700',
    messagePill: 'border-amber-200 bg-amber-100 text-amber-700',
    sectionBadgeMessages: 'border-amber-200 bg-amber-50 text-amber-700',
    sectionBadgeContacts: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    sectionBadgeMedia: 'border-amber-200 bg-amber-50 text-amber-700',
    sectionBadgeRecommendations: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    recommendationCard: 'border-emerald-100 bg-white',
    calloutSection: 'border-amber-200 bg-white',
    calloutButton: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200/70',
    calloutButtonIcon: 'text-amber-600',
    planSpotlight: 'border-amber-100 bg-white',
    planSpotlightAccent: 'text-amber-700',
    planSpotlightTag: 'bg-amber-100 text-amber-700'
  }
}

const ResultPage = () => {
  const navigate = useNavigate()
  const { trackEvent } = useMetaPixel()
  const [finalResults, setFinalResults] = useState<FinalResults | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [activeSection, setActiveSection] = useState<SectionKey>('overview')
  const [isExporting, setIsExporting] = useState<'pdf' | 'csv' | 'md' | null>(null)
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    overview: null,
    messages: null,
    contacts: null,
    media: null,
    recommendations: null
  })

  const registerSectionRef = useCallback(
    (key: SectionKey) => (node: HTMLDivElement | null) => {
      sectionRefs.current[key] = node
    },
    []
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const paymentConfirmed = localStorage.getItem('paymentConfirmed')
    const paymentTimestamp = localStorage.getItem('paymentTimestamp')

    if (!paymentConfirmed || paymentConfirmed !== 'true') {
      navigate('/')
      return
    }

    if (paymentTimestamp) {
      const timestamp = Number(paymentTimestamp)
      const oneHour = 60 * 60 * 1000
      if (Date.now() - timestamp > oneHour) {
        localStorage.removeItem('paymentConfirmed')
        localStorage.removeItem('paymentTimestamp')
        localStorage.removeItem('finalResults')
        navigate('/')
        return
      }
    }

    const results = localStorage.getItem('finalResults')
    const data = localStorage.getItem('analysisData')

    if (!results || !data) {
      navigate('/')
      return
    }

    try {
      setFinalResults(JSON.parse(results))
      setAnalysisData(JSON.parse(data))
    } catch (error) {
      navigate('/')
      return
    }

    trackEvent('ViewContent', {
      content_name: 'Analysis Results',
      content_category: 'Results Page'
    })
  }, [navigate, trackEvent])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute('data-section') as SectionKey)
          }
        })
      },
      {
        rootMargin: '-30% 0px -50% 0px',
        threshold: 0.3
      }
    )

    const elements = Object.values(sectionRefs.current).filter(Boolean) as HTMLDivElement[]
    elements.forEach(el => observer.observe(el))

    return () => {
      elements.forEach(el => observer.unobserve(el))
    }
  }, [finalResults])

  const stats = useMemo(() => {
    if (!finalResults) return null
    const mediaTotal = finalResults.mediaAnalysis.photos + finalResults.mediaAnalysis.videos
    return {
      messages: finalResults.detailedMessages.length,
      contacts: finalResults.suspiciousContacts.length,
      mediaTotal,
      deleted: finalResults.mediaAnalysis.deletedMedia
    }
  }, [finalResults])

  const planId: PlanId = analysisData?.selectedPlanId ?? 'basic'
  const theme = PLAN_THEMES[planId]
  const riskProgressClass = finalResults
    ? `bg-gradient-to-r ${
        finalResults.riskScore >= 75
          ? theme.heroProgressGradient.high
          : finalResults.riskScore >= 45
          ? theme.heroProgressGradient.medium
          : theme.heroProgressGradient.low
      }`
    : 'bg-slate-300'

  const planBenefits =
    planId === 'premium'
      ? [
          'Acompanhamento vitalício sem custos adicionais para novas auditorias.',
          'Atualizações automáticas sempre que novas evidências forem detectadas.',
          'Suporte prioritário e consultoria estratégica sob demanda.'
        ]
      : [
          'Cobertura completa dos últimos 30 dias de conversas, mídias e contatos.',
          'Exportações em PDF, CSV e Markdown prontas para arquivamento seguro.',
          'Suporte dedicado por 7 dias para orientar próximos passos com segurança.'
        ]

  const handleNewAnalysis = () => {
    localStorage.removeItem('paymentConfirmed')
    localStorage.removeItem('paymentTimestamp')
    localStorage.removeItem('finalResults')
    localStorage.removeItem('analysisResults')
    localStorage.removeItem('analysisData')
    navigate('/')
  }

  const handleExport = async (type: 'pdf' | 'csv' | 'md') => {
    if (!analysisData || !finalResults) return

    trackEvent('InitiateCheckout', {
      content_name: `Export ${type.toUpperCase()} Report`,
      content_category: 'Results Export'
    })

    if (type === 'pdf') {
      setIsExporting('pdf')
      setTimeout(() => {
        window.print()
        setIsExporting(null)
      }, 200)
      return
    }

    setIsExporting(type)
    await new Promise(resolve => setTimeout(resolve, 300))

    let content = ''
    let mime = 'text/plain'
    let extension = type

    if (type === 'csv') {
      mime = 'text/csv;charset=utf-8;'
      const header = 'tipo,descricao,contato,numero,risco\n'
      const messageRows = finalResults.detailedMessages.map(msg => `Mensagem,"${msg.replace(/"/g, '""')}",,,`)
      const contactRows = finalResults.suspiciousContacts.map(contact => `Contato,,${contact.name},${contact.number},${contact.risk}`)
      const mediaRow = `Mídias,"Fotos: ${finalResults.mediaAnalysis.photos} | Vídeos: ${finalResults.mediaAnalysis.videos}",,,`
      content = [header, ...messageRows, ...contactRows, mediaRow].join('\n')
    }

    if (type === 'md') {
      mime = 'text/markdown;charset=utf-8;'
      extension = 'md'
      content = `# Relatório detalhado\n\n- WhatsApp analisado: **${analysisData.whatsapp}**\n- Plano contratado: **${planLabel(analysisData.selectedPlanId)}**\n- Pontuação de risco: **${finalResults.riskScore}/100** (${riskLabel(finalResults.riskLevel)})\n\n## Mensagens suspeitas\n${finalResults.detailedMessages.length ? finalResults.detailedMessages.map(msg => `- ${msg}`).join('\n') : '- Nenhuma mensagem suspeita encontrada.'}\n\n## Contatos suspeitos\n${finalResults.suspiciousContacts.length ? finalResults.suspiciousContacts.map(contact => `- ${contact.name} (${contact.number}) • Risco ${contact.risk}`).join('\n') : '- Nenhum contato suspeito identificado.'}\n\n## Estatísticas de mídias\n- Fotos suspeitas: ${finalResults.mediaAnalysis.photos}\n- Vídeos suspeitos: ${finalResults.mediaAnalysis.videos}\n- Itens deletados: ${finalResults.mediaAnalysis.deletedMedia}`
    }

    const blob = new Blob([content], { type: mime })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-${Date.now()}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    setIsExporting(null)
  }

  const scrollToSection = (section: SectionKey) => {
    const target = sectionRefs.current[section]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!finalResults || !analysisData || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl border border-slate-200 bg-white px-10 py-8 text-center text-slate-600 shadow-xl">
          Carregando relatório completo...
        </div>
      </div>
    )
  }

  return (
    <div className={`relative min-h-screen overflow-hidden ${theme.pageBackground}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {theme.overlayBlobs.map((blobColor, index) => (
          <div
            key={`overlay-${index}`}
            className={`absolute ${OVERLAY_POSITIONS[index % OVERLAY_POSITIONS.length]} rounded-full ${blobColor} ${OVERLAY_BLURS[index % OVERLAY_BLURS.length]}`}
          />
        ))}
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-20 pt-12 lg:flex-row">
        <aside className="sticky top-10 h-fit w-full shrink-0 rounded-3xl border border-slate-200/70 bg-white/80 shadow-xl backdrop-blur lg:w-72">
          <div className="space-y-8 p-6">
            <header className="space-y-4">
              <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold ${theme.sidebarBadge}`}>
                <Shield className="h-4 w-4" /> Relatório exclusivo
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Resultado da análise</h1>
                <p className="text-sm text-slate-500">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </header>

            <section className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sessões</p>
              <nav className="space-y-2">
                {SECTION_CONFIG.map(section => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id)
                        scrollToSection(section.id)
                      }}
                      className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${isActive ? theme.navActive : theme.navInactive}`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-current' : 'text-slate-400 group-hover:text-current'}`} />
                      <div>
                        <p>{section.label}</p>
                        <p className="text-xs font-normal text-slate-400">{section.description}</p>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </section>

            <section className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Exportar</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleExport('pdf')}
                  className={`flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition ${theme.exportHover} disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={isExporting === 'pdf'}
                >
                  <span className="inline-flex items-center gap-2"><FileDown className="h-4 w-4" /> Relatório PDF</span>
                  <span className={`text-xs ${theme.exportTag}`}>{isExporting === 'pdf' ? 'Abrindo...' : 'Imprimir'}</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className={`flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition ${theme.exportHover} disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={isExporting === 'csv'}
                >
                  <span className="inline-flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Exportar CSV</span>
                  <span className={`text-xs ${theme.exportTag}`}>{isExporting === 'csv' ? 'Gerando...' : 'Download'}</span>
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className={`flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition ${theme.exportHover} disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={isExporting === 'md'}
                >
                  <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" /> Exportar Markdown</span>
                  <span className={`text-xs ${theme.exportTag}`}>{isExporting === 'md' ? 'Gerando...' : 'Download'}</span>
                </button>
              </div>
              <p className={`rounded-2xl border px-4 py-3 text-xs ${theme.hintCard}`}>
                Exportações ficam salvas localmente. Guarde com sigilo e não compartilhe sem proteção.
              </p>
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dados analisados</p>
                <p className="font-semibold text-slate-900">{analysisData.nome ?? 'Contato confidencial'}</p>
                <p className="text-xs text-slate-500">WhatsApp: {analysisData.whatsapp}</p>
              </div>
              <div className={`mt-3 flex items-center gap-3 text-xs ${theme.hintText}`}>
                <Sparkles className="h-4 w-4" /> Plano: {planLabel(analysisData.selectedPlanId)}
              </div>
            </section>
          </div>
        </aside>

        <main className="flex-1 space-y-12">
          <section
            ref={registerSectionRef('overview')}
            data-section="overview"
            className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/85 p-8 shadow-xl sm:p-12"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10" />
            <div className="relative z-10 flex flex-col gap-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs uppercase tracking-[0.3em] ${theme.heroChip}`}>
                    <Sparkles className="h-4 w-4" /> Relatório finalizado
                  </div>
                  <h2 className="mt-4 text-4xl font-bold text-slate-900 sm:text-5xl">
                    {analysisData.nome ? `Análise de ${analysisData.nome}` : 'Relatório confidencial'}
                  </h2>
                  <p className="mt-3 max-w-2xl text-base text-slate-600">
                    Resultado completo da auditoria realizada no WhatsApp {analysisData.whatsapp}. Avaliamos conversas, contatos e mídias para entregar uma visão clara do nível de risco identificado.
                  </p>
                </div>
                <div className={`rounded-3xl border px-6 py-6 text-right text-sm ${theme.heroStatCard}`}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pontuação de risco</p>
                  <p className={`mt-2 text-5xl font-black ${theme.heroAccentText}`}>
                    {finalResults.riskScore}
                    <span className="text-2xl text-slate-400">/100</span>
                  </p>
                  <p className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.heroBadge}`}>
                    <AlertTriangle className="h-4 w-4" /> {riskLabel(finalResults.riskLevel)}
                  </p>
                </div>
              </div>

              <div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200/70">
                  <div className={`absolute inset-y-0 left-0 rounded-full ${riskProgressClass}`} style={{ width: `${Math.min(finalResults.riskScore, 100)}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-xs text-slate-500">
                  <span>0 - Seguro</span>
                  <span>50 - Atenção</span>
                  <span>100 - Crítico</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className={`rounded-2xl border p-5 shadow-sm ${theme.statCard}`}>
                  <p className={`text-xs uppercase tracking-[0.2em] ${theme.statLabel}`}>Mensagens</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.messages}</p>
                  <p className="text-sm text-slate-500">Mensagens suspeitas registradas</p>
                </div>
                <div className={`rounded-2xl border p-5 shadow-sm ${theme.statCard}`}>
                  <p className={`text-xs uppercase tracking-[0.2em] ${theme.statLabel}`}>Contatos</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.contacts}</p>
                  <p className="text-sm text-slate-500">Contatos com comportamento crítico</p>
                </div>
                <div className={`rounded-2xl border p-5 shadow-sm ${theme.statCard}`}>
                  <p className={`text-xs uppercase tracking-[0.2em] ${theme.statLabel}`}>Mídias</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.mediaTotal}</p>
                  <p className="text-sm text-slate-500">Fotos e vídeos suspeitos</p>
                </div>
                <div className={`rounded-2xl border p-5 shadow-sm ${theme.statCard}`}>
                  <p className={`text-xs uppercase tracking-[0.2em] ${theme.statLabel}`}>Deletados</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.deleted}</p>
                  <p className="text-sm text-slate-500">Itens removidos recentemente</p>
                </div>
              </div>

              <div className={`rounded-2xl border px-6 py-6 shadow-sm ${theme.planSpotlight}`}>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${theme.planSpotlightTag}`}>
                      <Sparkles className="h-4 w-4" /> Benefícios do plano
                    </span>
                    <h3 className={`text-2xl font-semibold ${theme.planSpotlightAccent}`}>{planLabel(planId)}</h3>
                    <p className="text-sm text-slate-500">
                      Você tem acesso a recursos exclusivos conforme o plano contratado. Aproveite para tirar o máximo da investigação.
                    </p>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-600">
                    {planBenefits.map(benefit => (
                      <li key={benefit} className="flex items-start gap-3">
                        <CheckCircle className={`mt-0.5 h-4 w-4 ${theme.planSpotlightAccent}`} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section
            ref={registerSectionRef('messages')}
            data-section="messages"
            className="rounded-3xl border border-slate-200/70 bg-white/85 p-8 shadow-lg sm:p-10"
          >
            <header className="mb-6 flex items-start justify-between gap-6">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold ${theme.sectionBadgeMessages}`}>
                  <MessageCircle className="h-4 w-4" /> Conversas monitoradas
                </div>
                <h3 className="mt-4 text-3xl font-bold text-slate-900">Mensagens suspeitas</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Selecionamos as mensagens com maior potencial de risco para você revisar com atenção. Use-as como evidência documentada.
                </p>
              </div>
            </header>

            {finalResults.detailedMessages.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-center text-sm text-slate-500">
                Nenhuma mensagem suspeita foi detectada nesta análise.
              </div>
            ) : (
              <div className="space-y-5">
                {finalResults.detailedMessages.map((message, index) => (
                  <div key={index} className={`rounded-2xl border p-6 shadow-sm ${theme.messageCard}`}>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${theme.messageBadge}`}>
                        <MessageCircle className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-lg font-semibold text-slate-900">Mensagem suspeita</p>
                          <span className={`text-xs font-semibold ${theme.messagePill}`}>#{index + 1}</span>
                        </div>
                        <p className="mt-2 text-base leading-relaxed text-slate-600">“{message}”</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1">
                            <Eye className="h-3.5 w-3.5" /> Monitoramento sigiloso
                          </span>
                          <span className={`rounded-full border px-3 py-1 font-semibold ${theme.messagePill}`}>Sinal de alerta</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            ref={registerSectionRef('contacts')}
            data-section="contacts"
            className="rounded-3xl border border-slate-200/70 bg-white/85 p-8 shadow-lg sm:p-10"
          >
            <header className="mb-6 flex items-start justify-between gap-6">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold ${theme.sectionBadgeContacts}`}>
                  <Users className="h-4 w-4" /> Principais envolvidos
                </div>
                <h3 className="mt-4 text-3xl font-bold text-slate-900">Contatos em evidência</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Listei os contatos que apresentaram comportamento fora do padrão. Observe níveis de risco e padrões de interação.
                </p>
              </div>
            </header>

            {finalResults.suspiciousContacts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-center text-sm text-slate-500">
                Nenhum contato suspeito foi identificado nesta análise.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {finalResults.suspiciousContacts.map((contact, index) => (
                  <div key={`${contact.number}-${index}`} className={`rounded-2xl border p-6 shadow-sm ${theme.messageCard}`}>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${theme.sectionBadgeContacts}`}>
                        <Phone className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-slate-900">{contact.name || 'Contato não identificado'}</p>
                        <p className="mt-1 text-sm text-slate-500">{contact.number}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                          <span className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-slate-500">Interações recorrentes</span>
                          <span
                            className={`rounded-full border px-3 py-1 font-semibold ${
                              contact.risk === 'Alto'
                                ? 'border-rose-300 bg-rose-100 text-rose-700'
                                : 'border-amber-300 bg-amber-100 text-amber-700'
                            }`}
                          >
                            Risco {contact.risk}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            ref={registerSectionRef('media')}
            data-section="media"
            className="rounded-3xl border border-slate-200/70 bg-white/85 p-8 shadow-lg sm:p-10"
          >
            <header className="mb-6 flex items-start justify-between gap-6">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold ${theme.sectionBadgeMedia}`}>
                  <Image className="h-4 w-4" /> Evidências visuais
                </div>
                <h3 className="mt-4 text-3xl font-bold text-slate-900">Mídias e arquivos detectados</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Quantificamos todas as mídias compartilhadas e identificamos itens removidos logo após o envio.
                </p>
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
              <div className={`rounded-2xl border p-6 text-center shadow-sm ${theme.sectionBadgeMedia}`}>
                <p className="text-sm uppercase tracking-[0.2em]">Fotos</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">{finalResults.mediaAnalysis.photos}</p>
                <p className="text-xs text-slate-600">Compartilhadas durante o período</p>
              </div>
              <div className={`rounded-2xl border p-6 text-center shadow-sm ${theme.sectionBadgeContacts}`}>
                <p className="text-sm uppercase tracking-[0.2em]">Vídeos</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">{finalResults.mediaAnalysis.videos}</p>
                <p className="text-xs text-slate-600">Conteúdos audiovisuais</p>
              </div>
              <div className={`rounded-2xl border p-6 text-center shadow-sm ${theme.messagePill}`}>
                <p className="text-sm uppercase tracking-[0.2em]">Deletados</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">{finalResults.mediaAnalysis.deletedMedia}</p>
                <p className="text-xs text-slate-600">Itens removidos rapidamente</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/80 p-6">
              <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Eye className="h-5 w-5" /> Observações
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>• Horários de envio concentrados em períodos noturnos e madrugadas.</li>
                <li>• Vários arquivos foram apagados poucos minutos após o envio.</li>
                <li>• Parte das mídias foi compartilhada com contatos não salvos.</li>
              </ul>
            </div>
          </section>

          <section
            ref={registerSectionRef('recommendations')}
            data-section="recommendations"
            className="rounded-3xl border border-slate-200/70 bg-white/85 p-8 shadow-lg sm:p-10"
          >
            <header className="mb-6 flex items-start justify-between gap-6">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold ${theme.sectionBadgeRecommendations}`}>
                  <CheckCircle className="h-4 w-4" /> Estratégia sugerida
                </div>
                <h3 className="mt-4 text-3xl font-bold text-slate-900">Próximos passos recomendados</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Siga este roteiro para conduzir a situação com equilíbrio e segurança emocional.
                </p>
              </div>
            </header>

            {finalResults.recommendations.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-center text-sm text-slate-500">
                Nenhuma recomendação adicional foi registrada. Revise os dados e defina o melhor caminho.
              </div>
            ) : (
              <div className="space-y-4">
                {finalResults.recommendations.map((recommendation, index) => (
                  <div key={index} className={`rounded-2xl border p-6 shadow-sm ${theme.recommendationCard}`}>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${theme.sectionBadgeRecommendations}`}>
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Passo {index + 1}</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">{recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={`mt-8 rounded-2xl border px-6 py-6 shadow-sm ${theme.calloutSection}`}>
              <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <ArrowRight className={`h-5 w-5 ${theme.calloutButtonIcon}`} /> Tenha um plano claro
              </h4>
              <p className="mt-3 text-sm text-slate-600">
                Reúna as evidências exportadas, defina o momento apropriado para conversar e estabeleça limites saudáveis. Caso necessário, procure apoio psicológico ou jurídico especializado.
              </p>
            </div>
          </section>

          <section className={`rounded-3xl border px-8 py-10 shadow-xl sm:p-12 ${theme.calloutSection}`}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs uppercase tracking-[0.3em] ${theme.planSpotlightTag}`}>
                  Próxima análise
                </p>
                <h3 className={`mt-4 text-3xl font-bold ${theme.planSpotlightAccent}`}>Quer analisar outro número?</h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Inicie uma nova análise para continuar investigando com precisão e confidencialidade total.
                </p>
              </div>
              <button
                onClick={handleNewAnalysis}
                className={`group inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-sm font-semibold transition ${theme.calloutButton}`}
              >
                <Shield className="h-5 w-5" /> Nova análise
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default ResultPage
