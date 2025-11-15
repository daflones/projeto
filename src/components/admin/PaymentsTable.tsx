import { useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard, QrCode, CheckCircle, Clock, XCircle } from 'lucide-react'

interface Payment {
  id: string
  whatsapp: string
  nome: string
  amount: number
  payment_method: 'pix' | 'card'
  status: 'pending' | 'paid' | 'failed'
  created_at: string
}

interface PaymentsTableProps {
  pixPayments: any[]
  cardPayments: any[]
}

const PaymentsTable = ({ pixPayments, cardPayments }: PaymentsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'failed'>('all')
  const itemsPerPage = 10

  // Combinar pagamentos PIX e cartão
  const allPayments: Payment[] = [
    ...pixPayments.map(p => ({
      id: p.id,
      whatsapp: p.whatsapp || '-',
      nome: p.nome || 'Sem nome',
      amount: p.amount || 0,
      payment_method: 'pix' as const,
      // Converter payment_confirmed (boolean) para status (string)
      status: (p.payment_confirmed === true ? 'paid' : 'pending') as 'paid' | 'pending',
      created_at: p.created_at
    })),
    ...cardPayments.map(p => ({
      id: p.id,
      whatsapp: p.whatsapp || '-',
      nome: p.nome || p.card_holder || 'Sem nome',
      amount: p.amount || 0,
      payment_method: 'card' as const,
      // Converter payment_confirmed (boolean) para status (string)
      status: (p.payment_confirmed === true ? 'paid' : 'pending') as 'paid' | 'pending',
      created_at: p.created_at
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Filtrar por status
  const filteredPayments = filterStatus === 'all' 
    ? allPayments 
    : allPayments.filter(p => p.status === filterStatus)

  // Paginação
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPayments = filteredPayments.slice(startIndex, endIndex)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Pago
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
            <XCircle className="w-3 h-3" />
            Falhou
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { id: 'all' as const, label: 'Todos', tone: 'from-rose-500 to-pink-500', count: allPayments.length },
          { id: 'paid' as const, label: 'Pagos', tone: 'from-emerald-500 to-emerald-400', count: allPayments.filter(p => p.status === 'paid').length },
          { id: 'pending' as const, label: 'Pendentes', tone: 'from-amber-500 to-orange-400', count: allPayments.filter(p => p.status === 'pending').length },
          { id: 'failed' as const, label: 'Falhados', tone: 'from-slate-500 to-slate-400', count: allPayments.filter(p => p.status === 'failed').length }
        ].map(filter => {
          const isActive = filterStatus === filter.id
          return (
            <button
              key={filter.id}
              onClick={() => setFilterStatus(filter.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? `bg-gradient-to-r ${filter.tone} text-white shadow-lg shadow-rose-200/50`
                  : 'border border-rose-100 bg-white text-slate-600 hover:border-rose-200 hover:shadow-sm'
              }`}
            >
              {filter.label}
              <span className={isActive ? 'text-white/80 text-xs font-medium' : 'text-rose-400 text-xs font-medium'}>
                ({filter.count})
              </span>
            </button>
          )
        })}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rose-100/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <th className="py-4 px-4">WhatsApp</th>
              <th className="py-4 px-4">Nome</th>
              <th className="py-4 px-4 text-center">Método</th>
              <th className="py-4 px-4 text-right">Valor</th>
              <th className="py-4 px-4 text-center">Status</th>
              <th className="py-4 px-4">Data</th>
            </tr>
          </thead>
          <tbody>
            {currentPayments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Nenhum pagamento encontrado
                </td>
              </tr>
            ) : (
              currentPayments.map((payment, index) => (
                <tr
                  key={index}
                  className="border-b border-rose-100/60 text-slate-600 transition-colors hover:bg-rose-50/60"
                >
                  <td className="py-4 px-4">
                    <span className="font-mono text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                      {payment.whatsapp}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-700">
                    {payment.nome || '-'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {payment.payment_method === 'pix' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                        <QrCode className="w-3 h-3" />
                        PIX
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">
                        <CreditCard className="w-3 h-3" />
                        Cartão
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-slate-900">
                    R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="py-4 px-4 text-slate-500">
                    {new Date(payment.created_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-slate-500">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPayments.length)} de {filteredPayments.length} pagamentos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white text-slate-600 transition hover:border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-slate-600 px-4">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white text-slate-600 transition hover:border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentsTable
