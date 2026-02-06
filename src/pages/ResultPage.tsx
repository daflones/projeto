import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, CheckCircle, Clock, Eye, FileDown,
  FileSpreadsheet, FileText, Image, MessageCircle, Phone, Shield,
  Sparkles, Users, TrendingUp, Camera, Video, Trash2, User
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
  icon: LucideIcon
}

const SECTION_CONFIG: SectionConfig[] = [
  { id: 'overview', label: 'Resumo geral', icon: TrendingUp },
  { id: 'messages', label: 'Mensagens', icon: MessageCircle },
  { id: 'contacts', label: 'Contatos', icon: Users },
  { id: 'media', label: 'Mídias', icon: Image },
  { id: 'recommendations', label: 'Recomendações', icon: CheckCircle }
]

const riskLabel = (level: string) => {
  switch (level) {
    case 'high': return 'Alto risco'
    case 'medium': return 'Risco moderado'
    default: return 'Baixo risco'
  }
}

const riskColor = (level: string) => {
  switch (level) {
    case 'high': return { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-200', ring: 'ring-rose-500/20', gradient: 'from-rose-500 to-red-600' }
    case 'medium': return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-500/20', gradient: 'from-amber-400 to-orange-500' }
    default: return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-500/20', gradient: 'from-emerald-400 to-teal-500' }
  }
}

const planLabel = (planId?: PlanId) => {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    overview: null, messages: null, contacts: null, media: null, recommendations: null
  })

  const registerSectionRef = useCallback(
    (key: SectionKey) => (node: HTMLDivElement | null) => { sectionRefs.current[key] = node },
    []
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const paymentConfirmed = localStorage.getItem('paymentConfirmed')
    const paymentTimestamp = localStorage.getItem('paymentTimestamp')

    if (!paymentConfirmed || paymentConfirmed !== 'true') { navigate('/'); return }

    if (paymentTimestamp) {
      const timestamp = Number(paymentTimestamp)
      if (Date.now() - timestamp > 60 * 60 * 1000) {
        localStorage.removeItem('paymentConfirmed')
        localStorage.removeItem('paymentTimestamp')
        localStorage.removeItem('finalResults')
        navigate('/'); return
      }
    }

    const results = localStorage.getItem('finalResults')
    const data = localStorage.getItem('analysisData')
    if (!results || !data) { navigate('/'); return }

    try {
      setFinalResults(JSON.parse(results))
      setAnalysisData(JSON.parse(data))
    } catch { navigate('/'); return }

    trackEvent('ViewContent', { content_name: 'Analysis Results', content_category: 'Results Page' })
  }, [navigate, trackEvent])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(entry => { if (entry.isIntersecting) setActiveSection(entry.target.getAttribute('data-section') as SectionKey) }) },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0.2 }
    )
    const elements = Object.values(sectionRefs.current).filter(Boolean) as HTMLDivElement[]
    elements.forEach(el => observer.observe(el))
    return () => { elements.forEach(el => observer.unobserve(el)) }
  }, [finalResults])

  const stats = useMemo(() => {
    if (!finalResults) return null
    return {
      messages: finalResults.detailedMessages.length,
      contacts: finalResults.suspiciousContacts.length,
      mediaTotal: finalResults.mediaAnalysis.photos + finalResults.mediaAnalysis.videos,
      deleted: finalResults.mediaAnalysis.deletedMedia
    }
  }, [finalResults])

  const planId: PlanId = analysisData?.selectedPlanId ?? 'basic'
  const risk = finalResults ? riskColor(finalResults.riskLevel) : riskColor('low')

  const planBenefits = planId === 'premium'
    ? ['Acompanhamento vitalício sem custos adicionais.', 'Atualizações automáticas de novas evidências.', 'Suporte prioritário sob demanda.']
    : ['Cobertura completa dos últimos 30 dias.', 'Exportações em PDF, CSV e Markdown.', 'Suporte dedicado por 7 dias.']

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
    trackEvent('InitiateCheckout', { content_name: `Export ${type.toUpperCase()} Report`, content_category: 'Results Export' })

    if (type === 'pdf') {
      setIsExporting('pdf')
      setTimeout(() => { window.print(); setIsExporting(null) }, 200)
      return
    }

    setIsExporting(type)
    await new Promise(resolve => setTimeout(resolve, 300))

    let content = '', mime = 'text/plain', extension = type

    if (type === 'csv') {
      mime = 'text/csv;charset=utf-8;'
      const header = 'tipo,descricao,contato,numero,risco\n'
      const messageRows = finalResults.detailedMessages.map(msg => `Mensagem,"${msg.replace(/"/g, '""')}",,,`)
      const contactRows = finalResults.suspiciousContacts.map(c => `Contato,,${c.name},${c.number},${c.risk}`)
      const mediaRow = `Mídias,"Fotos: ${finalResults.mediaAnalysis.photos} | Vídeos: ${finalResults.mediaAnalysis.videos}",,,`
      content = [header, ...messageRows, ...contactRows, mediaRow].join('\n')
    }

    if (type === 'md') {
      mime = 'text/markdown;charset=utf-8;'
      extension = 'md'
      content = `# Relatório detalhado\n\n- WhatsApp: **${analysisData.whatsapp}**\n- Plano: **${planLabel(analysisData.selectedPlanId)}**\n- Risco: **${finalResults.riskScore}/100** (${riskLabel(finalResults.riskLevel)})\n\n## Mensagens suspeitas\n${finalResults.detailedMessages.length ? finalResults.detailedMessages.map(msg => `- ${msg}`).join('\n') : '- Nenhuma encontrada.'}\n\n## Contatos suspeitos\n${finalResults.suspiciousContacts.length ? finalResults.suspiciousContacts.map(c => `- ${c.name} (${c.number}) • Risco ${c.risk}`).join('\n') : '- Nenhum identificado.'}\n\n## Mídias\n- Fotos: ${finalResults.mediaAnalysis.photos}\n- Vídeos: ${finalResults.mediaAnalysis.videos}\n- Deletados: ${finalResults.mediaAnalysis.deletedMedia}`
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
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileMenuOpen(false)
  }

  if (!finalResults || !analysisData || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
          <p className="text-sm font-medium text-slate-500">Carregando relatório...</p>
        </div>
      </div>
    )
  }

  const riskPercent = Math.min(finalResults.riskScore, 100)
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (riskPercent / 100) * circumference

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile nav toggle */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-rose-500" />
            <span className="text-sm font-bold text-slate-900">Relatório</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {mobileMenuOpen ? 'Fechar' : 'Seções'}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3">
            <nav className="flex flex-wrap gap-2">
              {SECTION_CONFIG.map(s => (
                <button key={s.id} onClick={() => scrollToSection(s.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${activeSection === s.id ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] gap-0 lg:gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 w-64 space-y-5 py-6 pl-6">
            {/* Profile card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100">
                  <User className="h-5 w-5 text-rose-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{analysisData.nome ?? 'Confidencial'}</p>
                  <p className="truncate text-xs text-slate-500">{analysisData.whatsapp}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${risk.light} ${risk.text} ${risk.border} border`}>
                  <AlertTriangle className="h-3 w-3" /> {riskLabel(finalResults.riskLevel)}
                </span>
              </div>
            </div>

            {/* Nav */}
            <nav className="space-y-1">
              {SECTION_CONFIG.map(s => {
                const Icon = s.icon
                const isActive = activeSection === s.id
                return (
                  <button key={s.id} onClick={() => scrollToSection(s.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold transition-all ${isActive ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-rose-500' : 'text-slate-400'}`} />
                    {s.label}
                  </button>
                )
              })}
            </nav>

            {/* Export */}
            <div className="space-y-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Exportar</p>
              {([
                { type: 'pdf' as const, label: 'PDF', icon: FileDown, action: 'Imprimir' },
                { type: 'csv' as const, label: 'CSV', icon: FileSpreadsheet, action: 'Download' },
                { type: 'md' as const, label: 'Markdown', icon: FileText, action: 'Download' },
              ]).map(exp => (
                <button key={exp.type} onClick={() => handleExport(exp.type)} disabled={isExporting === exp.type}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50">
                  <span className="flex items-center gap-2"><exp.icon className="h-3.5 w-3.5 text-slate-400" />{exp.label}</span>
                  <span className="text-[11px] text-rose-500">{isExporting === exp.type ? '...' : exp.action}</span>
                </button>
              ))}
            </div>

            {/* Plan badge */}
            <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-bold text-rose-700">{planLabel(planId)}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                Relatório gerado em {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-6 px-4 py-6 lg:pr-6 lg:pl-0">
          {/* OVERVIEW */}
          <section ref={registerSectionRef('overview')} data-section="overview" className="space-y-6">
            {/* Risk score hero */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      Relatório finalizado
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" /> {new Date().toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                    {analysisData.nome ? `Relatório de ${analysisData.nome}` : 'Relatório confidencial'}
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                    Auditoria completa do WhatsApp <span className="font-semibold text-slate-700">{analysisData.whatsapp}</span>. Avaliamos conversas, contatos e mídias para identificar o nível de risco.
                  </p>
                </div>

                {/* Risk gauge */}
                <div className="flex flex-col items-center">
                  <div className="relative h-32 w-32">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                      <circle cx="60" cy="60" r="54" fill="none" stroke="url(#riskGrad)" strokeWidth="8"
                        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={finalResults.riskScore >= 75 ? '#f43f5e' : finalResults.riskScore >= 45 ? '#f59e0b' : '#10b981'} />
                          <stop offset="100%" stopColor={finalResults.riskScore >= 75 ? '#dc2626' : finalResults.riskScore >= 45 ? '#ea580c' : '#0d9488'} />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-black ${risk.text}`}>{finalResults.riskScore}</span>
                      <span className="text-[10px] font-semibold text-slate-400">/100</span>
                    </div>
                  </div>
                  <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${risk.light} ${risk.text} ${risk.border}`}>
                    <AlertTriangle className="h-3.5 w-3.5" /> {riskLabel(finalResults.riskLevel)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-6">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${risk.gradient} transition-all duration-1000`} style={{ width: `${riskPercent}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
                  <span>Seguro</span><span>Atenção</span><span>Crítico</span>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Mensagens', value: stats.messages, sub: 'suspeitas', icon: MessageCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
                { label: 'Contatos', value: stats.contacts, sub: 'em evidência', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { label: 'Mídias', value: stats.mediaTotal, sub: 'encontradas', icon: Image, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: 'Deletados', value: stats.deleted, sub: 'removidos', icon: Trash2, color: 'text-slate-500', bg: 'bg-slate-100' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-[11px] text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Plan benefits */}
            <div className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/80 to-white p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-rose-600">Seu plano</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{planLabel(planId)}</h3>
                  <p className="mt-1 text-xs text-slate-500">Recursos inclusos na sua investigação.</p>
                </div>
                <ul className="space-y-2">
                  {planBenefits.map(b => (
                    <li key={b} className="flex items-start gap-2 text-[13px] text-slate-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />{b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* MESSAGES */}
          <section ref={registerSectionRef('messages')} data-section="messages"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-rose-50 p-1.5"><MessageCircle className="h-4 w-4 text-rose-500" /></div>
                  <h2 className="text-lg font-bold text-slate-900">Mensagens suspeitas</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">Conversas com maior potencial de risco identificadas na auditoria.</p>
              </div>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">{finalResults.detailedMessages.length} encontrada{finalResults.detailedMessages.length !== 1 ? 's' : ''}</span>
            </div>

            {finalResults.detailedMessages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Nenhuma mensagem suspeita detectada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {finalResults.detailedMessages.map((message, index) => (
                  <div key={index} className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-rose-200 hover:bg-rose-50/30">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-relaxed text-slate-700">"{message}"</p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                          <Eye className="h-3 w-3" />
                          <span>Monitoramento sigiloso</span>
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-600">Alerta</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CONTACTS */}
          <section ref={registerSectionRef('contacts')} data-section="contacts"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-indigo-50 p-1.5"><Users className="h-4 w-4 text-indigo-500" /></div>
                  <h2 className="text-lg font-bold text-slate-900">Contatos em evidência</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">Contatos com comportamento fora do padrão durante o período analisado.</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">{finalResults.suspiciousContacts.length} contato{finalResults.suspiciousContacts.length !== 1 ? 's' : ''}</span>
            </div>

            {finalResults.suspiciousContacts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Nenhum contato suspeito identificado.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {finalResults.suspiciousContacts.map((contact, index) => {
                  const isHigh = contact.risk === 'Alto'
                  return (
                    <div key={`${contact.number}-${index}`}
                      className={`rounded-xl border p-4 transition hover:shadow-md ${isHigh ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isHigh ? 'bg-rose-100' : 'bg-indigo-100'}`}>
                          <User className={`h-5 w-5 ${isHigh ? 'text-rose-600' : 'text-indigo-600'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{contact.name || 'Não identificado'}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="h-3 w-3" /> {contact.number}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${isHigh ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {contact.risk}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* MEDIA */}
          <section ref={registerSectionRef('media')} data-section="media"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-50 p-1.5"><Image className="h-4 w-4 text-amber-500" /></div>
                <h2 className="text-lg font-bold text-slate-900">Mídias e arquivos</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">Fotos, vídeos e itens removidos encontrados durante a análise.</p>
            </div>

            {/* Media visual bars */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Fotos', value: finalResults.mediaAnalysis.photos, icon: Camera, color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-400' },
                { label: 'Vídeos', value: finalResults.mediaAnalysis.videos, icon: Video, color: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-400' },
                { label: 'Deletados', value: finalResults.mediaAnalysis.deletedMedia, icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50', bar: 'bg-rose-400' },
              ].map(m => {
                const maxVal = Math.max(finalResults.mediaAnalysis.photos, finalResults.mediaAnalysis.videos, finalResults.mediaAnalysis.deletedMedia, 1)
                const barWidth = (m.value / maxVal) * 100
                return (
                  <div key={m.label} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-1.5 ${m.bg}`}><m.icon className={`h-4 w-4 ${m.color}`} /></div>
                        <span className="text-xs font-semibold text-slate-600">{m.label}</span>
                      </div>
                      <span className="text-xl font-bold text-slate-900">{m.value}</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${m.bar} transition-all duration-700`} style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Media observations */}
            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <Eye className="h-3.5 w-3.5" /> Observações
              </h4>
              <ul className="mt-3 space-y-2 text-[13px] text-slate-600">
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />Horários de envio concentrados em períodos noturnos e madrugadas.</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />Vários arquivos foram apagados poucos minutos após o envio.</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />Parte das mídias foi compartilhada com contatos não salvos.</li>
              </ul>
            </div>
          </section>

          {/* RECOMMENDATIONS */}
          <section ref={registerSectionRef('recommendations')} data-section="recommendations"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-50 p-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /></div>
                <h2 className="text-lg font-bold text-slate-900">Próximos passos</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">Roteiro estratégico para conduzir a situação com equilíbrio.</p>
            </div>

            {finalResults.recommendations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Nenhuma recomendação adicional registrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {finalResults.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passo {index + 1}</p>
                      <p className="mt-1 text-[13px] font-medium text-slate-800">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action callout */}
            <div className="mt-5 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white p-4">
              <div className="flex items-start gap-3">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Tenha um plano claro</h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Reúna as evidências exportadas, defina o momento certo para conversar e estabeleça limites saudáveis. Procure apoio profissional se necessário.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA - New Analysis */}
          <section className="overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-500 to-rose-600 p-6 shadow-lg sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  Próxima análise
                </span>
                <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">Quer analisar outro número?</h3>
                <p className="mt-1 text-sm text-rose-100">
                  Inicie uma nova investigação com precisão e confidencialidade total.
                </p>
              </div>
              <button onClick={handleNewAnalysis}
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-rose-600 shadow-md transition hover:bg-rose-50 hover:shadow-lg">
                <Shield className="h-4 w-4" /> Nova análise
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
