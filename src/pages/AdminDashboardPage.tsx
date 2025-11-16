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
      if (leadsData) {
        const normalizedLeads = leadsData.map(lead => {
          const expiresAt = lead.payment_expires_at ? new Date(lead.payment_expires_at).getTime() : null
          const status = (() => {
            if (lead.payment_confirmed === true || lead.payment_status === 'paid') return 'paid'
            if (lead.payment_status === 'expired' || (expiresAt !== null && expiresAt <= Date.now())) return 'expired'
            if (lead.payment_status === 'pending' || lead.payment_confirmed === false) return 'pending'
            return lead.payment_status || 'no_payment'
          })()

          return {
            ...lead,
            payment_status: status
          }
        })

        setLeads(normalizedLeads)
      }
      setAnalyses(analysesData)
      if (pixPaymentsData) {
        const normalizedPix = pixPaymentsData.map(payment => {
          const expiresAt = payment.expires_at ? new Date(payment.expires_at).getTime() : null
          const status = payment.payment_confirmed === true
            ? 'paid'
            : expiresAt !== null && expiresAt <= Date.now()
              ? 'expired'
              : 'pending'

          return {
            ...payment,
            payment_status: status
          }
        })
        setPixPayments(normalizedPix)
      }
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-rose-50 via-white to-rose-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-rose-400"></div>
          <p className="text-base font-semibold text-slate-500">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 border-b border-rose-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Painel Administrativo
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Bem-vindo, <span className="font-semibold text-rose-500">{admin?.nome}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-500 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200/60 transition-transform hover:-translate-y-0.5 hover:shadow-xl"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-rose-100 bg-white/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
              { id: 'funnel', label: 'Funil', icon: TrendingUp },
              { id: 'leads', label: 'Leads', icon: Users },
              { id: 'payments', label: 'Pagamentos', icon: Wallet },
              { id: 'analyses', label: 'Análises', icon: Activity },
              { id: 'settings', label: 'Configurações', icon: Settings },
              { id: 'cards', label: 'Cards', icon: CreditCard }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-rose-500 shadow-sm shadow-rose-100'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-rose-100 bg-white/90 p-4 shadow-sm">
          <Calendar className="h-5 w-5 text-rose-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="rounded-xl border border-rose-100 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-inner focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/40">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3">
                    <DollarSign className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-600">Receita Total</p>
                    <p className="text-3xl font-bold text-slate-900">
                      R$ {stats?.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3">
                    <Wallet className="h-7 w-7 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600">Receita PIX</p>
                    <p className="text-3xl font-bold text-slate-900">
                      R$ {stats?.revenue_pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-blue-400">
                      {stats?.total_sales_pix || 0} vendas
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-lg shadow-purple-100/40">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-purple-50 p-3">
                    <CreditCard className="h-7 w-7 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600">Receita Cartão</p>
                    <p className="text-3xl font-bold text-slate-900">
                      R$ {stats?.revenue_card.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-purple-400">
                      {stats?.total_sales_card || 0} vendas
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-lg shadow-amber-100/40">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <Activity className="h-7 w-7 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-600">Ticket Médio</p>
                    <p className="text-3xl font-bold text-slate-900">
                      R$ {stats?.avg_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-amber-400">Por venda</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Events Table */}
            <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/40">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <BarChart3 className="h-5 w-5 text-rose-500" />
                Eventos por Dia
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-rose-100">
                      <th className="py-3 px-4 text-left text-sm font-semibold text-slate-400">Data</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-slate-400">Visualizações</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-slate-400">Leads</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-slate-400">Checkouts</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-slate-400">Vendas</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-slate-400">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsByDay.slice(0, 10).map((day, index) => (
                      <tr key={index} className="border-b border-rose-50/70 transition-colors hover:bg-rose-50/60">
                        <td className="py-3 px-4 text-sm font-medium text-slate-600">
                          {new Date(day.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-slate-500">{day.page_views}</td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-slate-500">{day.leads}</td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-slate-500">{day.checkouts}</td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-slate-500">{day.sales}</td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-emerald-500">
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
          <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/40">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-900">
              <TrendingUp className="h-6 w-6 text-rose-500" />
              Funil de Conversão
            </h3>
            <FunnelChart data={funnelStats} />
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/40">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Users className="h-6 w-6 text-rose-500" />
                Leads Capturados ({leads.length})
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-600">
                  <Check className="h-3 w-3" />
                  {paymentStats?.paid_leads || 0} Pagos
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-600">
                  <Clock className="h-3 w-3" />
                  {paymentStats?.pending_leads || 0} Pendentes
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-500">
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
          <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/40">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-900">
              <Wallet className="h-6 w-6 text-rose-500" />
              Pagamentos ({pixPayments.length + cardPayments.length})
            </h3>
            <PaymentsTable
              pixPayments={pixPayments}
              cardPayments={cardPayments}
              onRefresh={loadDashboardData}
            />
          </div>
        )}

        {/* Analyses Tab */}
        {activeTab === 'analyses' && (
          <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/40">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-900">
              <Activity className="h-6 w-6 text-rose-500" />
              Análises Realizadas ({analyses.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-rose-100">
                    <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">WhatsApp</th>
                    <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Nome</th>
                    <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Mensagens</th>
                    <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Mídias</th>
                    <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Contatos</th>
                    <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Risco</th>
                    <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.slice(0, 20).map((analysis, index) => (
                    <tr key={index} className="border-b border-rose-50/70 transition-colors hover:bg-rose-50/60">
                      <td className="py-4 px-4">
                        <span className="rounded-lg bg-rose-50 px-3 py-1 font-mono text-sm font-medium text-rose-500">
                          {analysis.whatsapp}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-500">{analysis.nome || '-'}</td>
                      <td className="py-4 px-4 text-center text-sm font-medium text-slate-500">{analysis.messages_count}</td>
                      <td className="py-4 px-4 text-center text-sm font-medium text-slate-500">{analysis.media_count}</td>
                      <td className="py-4 px-4 text-center text-sm font-medium text-slate-500">{analysis.contacts_count}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          analysis.risk_level === 'high'
                            ? 'bg-rose-100 text-rose-600'
                            : analysis.risk_level === 'medium'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {analysis.risk_level === 'high' ? 'Alto' : analysis.risk_level === 'medium' ? 'Médio' : 'Baixo'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-400">
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
            <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/40">
              <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-900">
                <Settings className="h-6 w-6 text-rose-500" />
                Meta Pixel (Facebook)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-500">
                    Pixel ID
                  </label>
                  <input
                    type="text"
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    placeholder="123456789012345"
                    className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-slate-600 placeholder-slate-400 shadow-inner focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                  <p className="mt-2 text-sm text-slate-400">
                    Obtenha seu Pixel ID em:{' '}
                    <a
                      href="https://business.facebook.com/events_manager/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-rose-500 underline decoration-rose-200 decoration-2 hover:text-rose-600"
                    >
                      Meta Events Manager
                    </a>
                  </p>
                </div>

                {pixelSuccess && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <p className="text-sm font-medium text-emerald-600">Pixel ID atualizado com sucesso!</p>
                  </div>
                )}

                <button
                  onClick={handleUpdatePixel}
                  disabled={isLoadingPixel}
                  className="rounded-xl bg-rose-500 px-6 py-3 font-semibold text-white shadow-md shadow-rose-200/60 transition-transform hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isLoadingPixel ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Salvando...
                    </div>
                  ) : (
                    'Salvar Configurações'
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/40">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Informações da Conta</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-400">Nome</p>
                  <p className="text-base font-semibold text-slate-700">{admin?.nome}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Email</p>
                  <p className="text-base font-semibold text-slate-700">{admin?.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/40">
              <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-900">
                <CreditCard className="h-6 w-6 text-rose-500" />
                Dados de Cartões ({cardPayments.length})
              </h3>
              
              {/* Tabela de Cards */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-rose-100">
                      <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">WhatsApp</th>
                      <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Titular</th>
                      <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">CPF</th>
                      <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Número do Cartão</th>
                      <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Validade</th>
                      <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">CVV</th>
                      <th className="py-4 px-4 text-right text-sm font-semibold text-slate-400">Valor</th>
                      <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Data</th>
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
                            className="border-b border-rose-50/70 transition-colors hover:bg-rose-50/60"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="rounded-lg bg-rose-50 px-3 py-1 font-mono text-sm font-medium text-rose-500">
                                  {card.whatsapp || '-'}
                                </span>
                                {card.whatsapp && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(card.whatsapp)
                                    }}
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                    title="Copiar WhatsApp"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-500">
                                  {card.card_holder || card.nome || '-'}
                                </span>
                                {(card.card_holder || card.nome) && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(card.card_holder || card.nome)
                                    }}
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                    title="Copiar Nome"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium text-slate-500">
                                  {card.cpf || '-'}
                                </span>
                                {card.cpf && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(card.cpf)
                                    }}
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                    title="Copiar CPF"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="rounded-lg bg-slate-50 px-3 py-1 font-mono text-sm font-medium text-slate-600">
                                  {card.card_number || '-'}
                                </span>
                                {card.card_number && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(card.card_number)
                                    }}
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                    title="Copiar Número do Cartão"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono text-sm font-medium text-slate-500">
                                  {card.expiry_date || '-'}
                                </span>
                                {card.expiry_date && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(card.expiry_date)
                                    }}
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                    title="Copiar Validade"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono text-sm font-medium text-slate-500">
                                  {card.cvv || '-'}
                                </span>
                                {card.cvv && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(card.cvv)
                                    }}
                                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                    title="Copiar CVV"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right text-sm font-semibold text-slate-600">
                              R$ {card.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                            </td>
                            <td className="py-4 px-4 text-sm font-medium text-slate-400">
                              {new Date(card.created_at).toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboardPage
