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
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            <CheckCircle className="h-3 w-3" />
            Pago
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
            <Clock className="h-3 w-3" />
            Pendente
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
            <XCircle className="h-3 w-3" />
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
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilterStatus('all')}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            filterStatus === 'all'
              ? 'border-rose-200 bg-rose-500 text-white shadow-sm shadow-rose-200/60'
              : 'border-rose-100 bg-white text-rose-400 hover:bg-rose-50'
          }`}
        >
          Todos ({allPayments.length})
        </button>
        <button
          onClick={() => setFilterStatus('paid')}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            filterStatus === 'paid'
              ? 'border-emerald-200 bg-emerald-500 text-white shadow-sm shadow-emerald-200/50'
              : 'border-emerald-100 bg-white text-emerald-500 hover:bg-emerald-50'
          }`}
        >
          Pagos ({allPayments.filter(p => p.status === 'paid').length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            filterStatus === 'pending'
              ? 'border-amber-200 bg-amber-500 text-white shadow-sm shadow-amber-200/50'
              : 'border-amber-100 bg-white text-amber-500 hover:bg-amber-50'
          }`}
        >
          Pendentes ({allPayments.filter(p => p.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilterStatus('failed')}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            filterStatus === 'failed'
              ? 'border-rose-200 bg-rose-500 text-white shadow-sm shadow-rose-200/60'
              : 'border-rose-100 bg-white text-rose-500 hover:bg-rose-50'
          }`}
        >
          Falhados ({allPayments.filter(p => p.status === 'failed').length})
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rose-100">
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">WhatsApp</th>
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Nome</th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Método</th>
              <th className="py-4 px-4 text-right text-sm font-semibold text-slate-400">Valor</th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Status</th>
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Data</th>
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
                  className="border-b border-rose-50/70 transition-colors hover:bg-rose-50/60"
                >
                  <td className="py-4 px-4">
                    <span className="rounded-lg bg-rose-50 px-3 py-1 font-mono text-sm font-medium text-rose-500">
                      {payment.whatsapp}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-slate-500">
                    {payment.nome || '-'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {payment.payment_method === 'pix' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-500">
                        <QrCode className="h-3 w-3" />
                        PIX
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-500">
                        <CreditCard className="h-3 w-3" />
                        Cartão
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-semibold text-slate-600">
                    R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-slate-400">
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
          <p className="text-sm text-slate-400">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPayments.length)} de {filteredPayments.length} pagamentos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-rose-100 bg-white p-2 text-rose-400 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 text-sm font-medium text-slate-500">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-rose-100 bg-white p-2 text-rose-400 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentsTable
