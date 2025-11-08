import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Users, TrendingUp, DollarSign, Eye, MousePointerClick,
  ShoppingCart, CheckCircle, LogOut, Settings, RefreshCw, Calendar,
  Activity, Wallet, Check, Clock, X, CreditCard
} from 'lucide-react'
import { useAdmin } from '../contexts/AdminContext'
import {
  getDashboardStats, getEventsByDay, getConversionFunnelStats,
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
  const [leads, setLeads] = useState<any[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [pixPayments, setPixPayments] = useState<any[]>([])
  const [cardPayments, setCardPayments] = useState<any[]>([])
  const [metaPixelId, setMetaPixelId] = useState('')
  const [isLoadingPixel, setIsLoadingPixel] = useState(false)
  const [pixelSuccess, setPixelSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'leads' | 'payments' | 'analyses' | 'settings'>('overview')
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

      const [statsData, paymentData, eventsData, funnelData, leadsData, analysesData, pixPaymentsData, cardPaymentsData, pixelData] = await Promise.all([
        getDashboardStats(startDate, endDate),
        getPaymentStats(),
        getEventsByDay(dateRange),
        getConversionFunnelStats(startDate, endDate),
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
      setLeads(leadsData)
      setAnalyses(analysesData)
      setPixPayments(pixPaymentsData)
      setCardPayments(cardPaymentsData)
      setMetaPixelId(pixelData || '')
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
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
      console.error('Erro ao atualizar pixel:', error)
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg font-semibold">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                Painel Administrativo
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Bem-vindo, <span className="text-white font-semibold">{admin?.nome}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDashboardData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-all hover:scale-105"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800/30 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
              { id: 'funnel', label: 'Funil', icon: TrendingUp },
              { id: 'leads', label: 'Leads', icon: Users },
              { id: 'payments', label: 'Pagamentos', icon: Wallet },
              { id: 'analyses', label: 'Análises', icon: Activity },
              { id: 'settings', label: 'Configurações', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Selector */}
        <div className="mb-6 flex items-center gap-4 bg-gray-800/50 backdrop-blur-xl rounded-xl p-4 border border-gray-700/50">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                title="Checkouts"
                value={stats?.total_checkouts.toLocaleString() || '0'}
                subtitle="Iniciados"
                icon={ShoppingCart}
                iconColor="bg-yellow-500/20 text-yellow-400"
              />
              <StatsCard
                title="Vendas"
                value={stats?.total_sales.toLocaleString() || '0'}
                subtitle={`PIX: ${stats?.total_sales_pix || 0} | Card: ${stats?.total_sales_card || 0}`}
                icon={CheckCircle}
                iconColor="bg-red-500/20 text-red-400"
              />
            </div>

            {/* Revenue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Receita Total */}
              <div className="bg-gradient-to-br from-green-500/10 via-green-600/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20 hover:border-green-500/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <DollarSign className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Receita Total</p>
                    <p className="text-3xl font-bold text-white">
                      R$ {stats?.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Receita PIX */}
              <div className="bg-gradient-to-br from-blue-500/10 via-blue-600/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Wallet className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Receita PIX</p>
                    <p className="text-3xl font-bold text-white">
                      R$ {stats?.revenue_pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats?.total_sales_pix || 0} vendas
                    </p>
                  </div>
                </div>
              </div>

              {/* Receita Cartão */}
              <div className="bg-gradient-to-br from-purple-500/10 via-purple-600/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <CreditCard className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Receita Cartão</p>
                    <p className="text-3xl font-bold text-white">
                      R$ {stats?.revenue_card.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats?.total_sales_card || 0} vendas
                    </p>
                  </div>
                </div>
              </div>

              {/* Ticket Médio */}
              <div className="bg-gradient-to-br from-orange-500/10 via-orange-600/10 to-amber-500/10 rounded-xl p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-orange-500/20 rounded-lg">
                    <Activity className="w-8 h-8 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Ticket Médio</p>
                    <p className="text-3xl font-bold text-white">
                      R$ {stats?.avg_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Por venda
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Events Table */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-red-500" />
                Eventos por Dia
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Data</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Visualizações</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Leads</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Checkouts</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Vendas</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsByDay.slice(0, 10).map((day, index) => (
                      <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-white font-medium">
                          {new Date(day.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-300 text-right">{day.page_views}</td>
                        <td className="py-3 px-4 text-sm text-gray-300 text-right">{day.leads}</td>
                        <td className="py-3 px-4 text-sm text-gray-300 text-right">{day.checkouts}</td>
                        <td className="py-3 px-4 text-sm text-gray-300 text-right">{day.sales}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-green-400 text-right">
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
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-red-500" />
              Funil de Conversão
            </h3>
            <FunnelChart data={funnelStats} />
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-red-500" />
                Leads Capturados ({leads.length})
              </h3>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg">
                  <Check className="w-3 h-3" />
                  {paymentStats?.paid_leads || 0} Pagos
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">
                  <Clock className="w-3 h-3" />
                  {paymentStats?.pending_leads || 0} Pendentes
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-500/20 text-gray-400 rounded-lg">
                  <X className="w-3 h-3" />
                  {paymentStats?.expired_leads || 0} Expirados
                </span>
              </div>
            </div>
            <LeadsTable leads={leads} onUpdate={loadDashboardData} />
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-red-500" />
              Pagamentos ({pixPayments.length + cardPayments.length})
            </h3>
            <PaymentsTable pixPayments={pixPayments} cardPayments={cardPayments} />
          </div>
        )}

        {/* Analyses Tab */}
        {activeTab === 'analyses' && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-red-500" />
              Análises Realizadas ({analyses.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">WhatsApp</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">Nome</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-gray-300">Mensagens</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-gray-300">Mídias</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-gray-300">Contatos</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-gray-300">Risco</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.slice(0, 20).map((analysis, index) => (
                    <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="py-4 px-4">
                        <span className="text-sm text-white font-mono bg-gray-800 px-3 py-1 rounded-lg">
                          {analysis.whatsapp}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-300">{analysis.nome || '-'}</td>
                      <td className="py-4 px-4 text-sm text-gray-300 text-center">{analysis.messages_count}</td>
                      <td className="py-4 px-4 text-sm text-gray-300 text-center">{analysis.media_count}</td>
                      <td className="py-4 px-4 text-sm text-gray-300 text-center">{analysis.contacts_count}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          analysis.risk_level === 'high'
                            ? 'bg-red-500/20 text-red-400'
                            : analysis.risk_level === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {analysis.risk_level === 'high' ? 'Alto' : analysis.risk_level === 'medium' ? 'Médio' : 'Baixo'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-400">
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
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6 text-red-500" />
                Meta Pixel (Facebook)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pixel ID
                  </label>
                  <input
                    type="text"
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    placeholder="123456789012345"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                  <p className="mt-2 text-sm text-gray-400">
                    Obtenha seu Pixel ID em:{' '}
                    <a
                      href="https://business.facebook.com/events_manager/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 underline"
                    >
                      Meta Events Manager
                    </a>
                  </p>
                </div>

                {pixelSuccess && (
                  <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p className="text-sm text-green-400">Pixel ID atualizado com sucesso!</p>
                  </div>
                )}

                <button
                  onClick={handleUpdatePixel}
                  disabled={isLoadingPixel}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoadingPixel ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </div>
                  ) : (
                    'Salvar Configurações'
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Informações da Conta</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Nome</p>
                  <p className="text-white font-medium">{admin?.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white font-medium">{admin?.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboardPage
