 import { useEffect, useMemo, useRef, useState } from 'react'

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

interface AnalysisData {
  whatsapp: string
  nome?: string
  selectedPlanId?: 'basic' | 'premium'
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

const planLabel = (planId?: 'basic' | 'premium') => {
  if (planId === 'premium') return 'Plano Vitalício'
  if (planId === 'basic') return 'Análise Completa'
  return 'Plano não informado'
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-10 py-8 text-center text-slate-200 shadow-xl">
          Carregando relatório completo...
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-rose-600/20 blur-[120px]" />
        <div className="absolute right-10 top-60 h-72 w-72 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute -bottom-10 left-1/3 h-96 w-96 rounded-full bg-amber-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-20 pt-12 lg:flex-row">
        <aside className="sticky top-10 h-fit w-full shrink-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg lg:w-72">
          <div className="space-y-8 p-6">
            <header className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/20 px-4 py-1 text-xs font-semibold text-rose-100">
                <Shield className="h-4 w-4" /> Relatório exclusivo
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Resultado da análise</h1>
                <p className="text-sm text-slate-300/80">{new Date().toLocaleDateString('pt-BR')}</p>
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
                      className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                        isActive
                          ? 'border-rose-400/50 bg-rose-500/20 text-white shadow-lg shadow-rose-500/30'
                          : 'border-white/5 bg-white/5 text-slate-300 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-rose-100' : 'text-rose-200/60 group-hover:text-rose-100'}`} />
                      <div>
                        <p className="text-sm font-semibold">{section.label}</p>
                        <p className="text-xs text-slate-300/70">{section.description}</p>
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
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-rose-400/40 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isExporting === 'pdf'}
                >
                  <span className="inline-flex items-center gap-2"><FileDown className="h-4 w-4" /> Relatório PDF</span>
                  <span className="text-xs text-rose-100">{isExporting === 'pdf' ? 'Abrindo...' : 'Imprimir'}</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-rose-400/40 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isExporting === 'csv'}
                >
                  <span className="inline-flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Exportar CSV</span>
                  <span className="text-xs text-rose-100">{isExporting === 'csv' ? 'Gerando...' : 'Download'}</span>
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-rose-400/40 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isExporting === 'md'}
                >
                  <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" /> Exportar Markdown</span>
                  <span className="text-xs text-rose-100">{isExporting === 'md' ? 'Gerando...' : 'Download'}</span>
                </button>
              </div>
              <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                Exportações ficam salvas localmente. Guarde com sigilo e não compartilhe sem proteção.
              </p>
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dados analisados</p>
                <p className="font-semibold text-white">{analysisData.nome ?? 'Contato confidencial'}</p>
                <p className="text-xs text-slate-400">WhatsApp: {analysisData.whatsapp}</p>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                <Sparkles className="h-4 w-4 text-rose-200" /> Plano: {planLabel(analysisData.selectedPlanId)}
              </div>
            </section>
          </div>
        </aside>

        <main className="flex-1 space-y-12">
          <section
            ref={el => (sectionRefs.current.overview = el)}
            data-section="overview"
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 sm:p-12"
          >
            <div className="absolute inset-0 opacity-40">
              <div className="absolute -top-24 left-1/3 h-64 w-64 rounded-full bg-rose-500/40 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-400/30 blur-3xl" />
            </div>
            <div className="relative z-10 flex flex-col gap-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-slate-200">
                    <Sparkles className="h-4 w-4" /> Relatório finalizado
                  </div>
                  <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
                    {analysisData.nome ? `Análise de ${analysisData.nome}` : 'Relatório confidencial'}
                  </h2>
                  <p className="mt-3 max-w-2xl text-base text-slate-200/80">
                    Resultado completo da auditoria realizada no WhatsApp {analysisData.whatsapp}. Avaliamos conversas, contatos e mídias para entregar uma visão clara do nível de risco identificado.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-right text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Pontuação de risco</p>
                  <p className="mt-2 text-5xl font-black text-white">{finalResults.riskScore}<span className="text-2xl text-white/60">/100</span></p>
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-rose-100">
                    <AlertTriangle className="h-4 w-4" /> {riskLabel(finalResults.riskLevel)}
                  </p>
                </div>
              </div>

              <div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      finalResults.riskScore >= 75
                        ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700'
                        : finalResults.riskScore >= 45
                        ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500'
                        : 'bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500'
                    }`}
                    style={{ width: `${Math.min(finalResults.riskScore, 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-xs text-slate-300">
                  <span>0 - Seguro</span>
                  <span>50 - Atenção</span>
                  <span>100 - Crítico</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-rose-100/70">Mensagens</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.messages}</p>
                  <p className="text-sm text-rose-100/70">Mensagens suspeitas registradas</p>
                </div>
                <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-100/70">Contatos</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.contacts}</p>
                  <p className="text-sm text-indigo-100/70">Contatos com comportamento crítico</p>
                </div>
                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">Mídias</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.mediaTotal}</p>
                  <p className="text-sm text-amber-100/70">Fotos e vídeos suspeitos</p>
                </div>
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Deletados</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.deleted}</p>
                  <p className="text-sm text-emerald-100/70">Itens removidos recentemente</p>
                </div>
              </div>
            </div>
          </section>

          <section
            ref={el => (sectionRefs.current.messages = el)}
            data-section="messages"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10"
          >
            <header className="mb-6 flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-1 text-xs font-semibold text-rose-100">
                  <MessageCircle className="h-4 w-4" /> Conversas monitoradas
                </div>
                <h3 className="mt-4 text-3xl font-bold text-white">Mensagens suspeitas</h3>
                <p className="mt-2 text-sm text-slate-300/80">
                  Selecionamos as mensagens com maior potencial de risco para você revisar com atenção. Use-as como evidência documentada.
                </p>
              </div>
            </header>

            {finalResults.detailedMessages.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
                Nenhuma mensagem suspeita foi detectada nesta análise.
              </div>
            ) : (
              <div className="space-y-5">
                {finalResults.detailedMessages.map((message, index) => (
                  <div
                    key={index}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-transparent p-6"
                  >
                    <span className="absolute right-6 top-5 text-xs font-semibold text-rose-100/80">#{index + 1}</span>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/10">
                        <MessageCircle className="h-6 w-6 text-rose-100" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-white">Mensagem suspeita</p>
                        <p className="mt-2 text-base leading-relaxed text-slate-200">“{message}”</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300/80">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            <Eye className="h-3.5 w-3.5" /> Monitoramento sigiloso
                          </span>
                          <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-rose-100">Sinal de alerta</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            ref={el => (sectionRefs.current.contacts = el)}
            data-section="contacts"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10"
          >
            <header className="mb-6 flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1 text-xs font-semibold text-indigo-100">
                  <Users className="h-4 w-4" /> Principais envolvidos
                </div>
                <h3 className="mt-4 text-3xl font-bold text-white">Contatos em evidência</h3>
                <p className="mt-2 text-sm text-slate-300/80">
                  Listei os contatos que apresentaram comportamento fora do padrão. Observe níveis de risco e padrões de interação.
                </p>
              </div>
            </header>

            {finalResults.suspiciousContacts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
                Nenhum contato suspeito foi identificado nesta análise.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {finalResults.suspiciousContacts.map((contact, index) => (
                  <div
                    key={`${contact.number}-${index}`}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-transparent p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10">
                        <Phone className="h-5 w-5 text-indigo-100" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-white">{contact.name || 'Contato não identificado'}</p>
                        <p className="mt-1 text-sm text-indigo-100/80">{contact.number}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">Interações recorrentes</span>
                          <span className={`rounded-full border px-3 py-1 font-semibold ${
                            contact.risk === 'Alto'
                              ? 'border-rose-400/50 bg-rose-500/20 text-rose-100'
                              : 'border-amber-400/40 bg-amber-500/20 text-amber-100'
                          }`}>
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
            ref={el => (sectionRefs.current.media = el)}
            data-section="media"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10"
          >
            <header className="mb-6 flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1 text-xs font-semibold text-amber-100">
                  <Image className="h-4 w-4" /> Evidências visuais
                </div>
                <h3 className="mt-4 text-3xl font-bold text-white">Mídias e arquivos detectados</h3>
                <p className="mt-2 text-sm text-slate-300/80">
                  Quantificamos todas as mídias compartilhadas e identificamos itens removidos logo após o envio.
                </p>
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-amber-100/70">Fotos</p>
                <p className="mt-3 text-4xl font-bold text-white">{finalResults.mediaAnalysis.photos}</p>
                <p className="text-xs text-amber-100/70">Compartilhadas durante o período</p>
              </div>
              <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-indigo-100/70">Vídeos</p>
                <p className="mt-3 text-4xl font-bold text-white">{finalResults.mediaAnalysis.videos}</p>
                <p className="text-xs text-indigo-100/70">Conteúdos audiovisuais</p>
              </div>
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-rose-100/70">Deletados</p>
                <p className="mt-3 text-4xl font-bold text-white">{finalResults.mediaAnalysis.deletedMedia}</p>
                <p className="text-xs text-rose-100/70">Itens removidos rapidamente</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                <Eye className="h-5 w-5 text-amber-100" /> Observações
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-slate-300/80">
                <li>• Horários de envio concentrados em períodos noturnos e madrugadas.</li>
                <li>• Vários arquivos foram apagados poucos minutos após o envio.</li>
                <li>• Parte das mídias foi compartilhada com contatos não salvos.</li>
              </ul>
            </div>
          </section>

          <section
            ref={el => (sectionRefs.current.recommendations = el)}
            data-section="recommendations"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10"
          >
            <header className="mb-6 flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold text-emerald-100">
                  <CheckCircle className="h-4 w-4" /> Estratégia sugerida
                </div>
                <h3 className="mt-4 text-3xl font-bold text-white">Próximos passos recomendados</h3>
                <p className="mt-2 text-sm text-slate-300/80">
                  Siga este roteiro para conduzir a situação com equilíbrio e segurança emocional.
                </p>
              </div>
            </header>

            {finalResults.recommendations.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
                Nenhuma recomendação adicional foi registrada. Revise os dados e defina o melhor caminho.
              </div>
            ) : (
              <div className="space-y-4">
                {finalResults.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-100">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-emerald-200/70">Passo {index + 1}</p>
                        <p className="mt-2 text-base font-semibold text-white">{recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                <ArrowRight className="h-5 w-5 text-emerald-100" /> Tenha um plano claro
              </h4>
              <p className="mt-3 text-sm text-slate-300/80">
                Reúna as evidências exportadas, defina o momento apropriado para conversar e estabeleça limites saudáveis. Caso necessário, procure apoio psicológico ou jurídico especializado.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent p-8 sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/80">
                  Próxima análise
                </p>
                <h3 className="mt-4 text-3xl font-bold text-white">Quer analisar outro número?</h3>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  Inicie uma nova análise para continuar investigando com precisão e confidencialidade total.
                </p>
              </div>
              <button
                onClick={handleNewAnalysis}
                className="group inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
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
