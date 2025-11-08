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
      whatsapp: p.whatsapp,
      nome: p.nome,
      amount: p.amount || 0,
      payment_method: 'pix' as const,
      // Converter payment_confirmed (boolean) para status (string)
      status: (p.payment_confirmed === true ? 'paid' : 'pending') as 'paid' | 'pending',
      created_at: p.created_at
    })),
    ...cardPayments.map(p => ({
      id: p.id,
      whatsapp: p.whatsapp,
      nome: p.nome,
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
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'all'
              ? 'bg-red-500 text-white'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Todos ({allPayments.length})
        </button>
        <button
          onClick={() => setFilterStatus('paid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'paid'
              ? 'bg-green-500 text-white'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Pagos ({allPayments.filter(p => p.status === 'paid').length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Pendentes ({allPayments.filter(p => p.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilterStatus('failed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'failed'
              ? 'bg-red-500 text-white'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Falhados ({allPayments.filter(p => p.status === 'failed').length})
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">WhatsApp</th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">Nome</th>
              <th className="text-center py-4 px-4 text-sm font-semibold text-gray-300">Método</th>
              <th className="text-right py-4 px-4 text-sm font-semibold text-gray-300">Valor</th>
              <th className="text-center py-4 px-4 text-sm font-semibold text-gray-300">Status</th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">Data</th>
            </tr>
          </thead>
          <tbody>
            {currentPayments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  Nenhum pagamento encontrado
                </td>
              </tr>
            ) : (
              currentPayments.map((payment, index) => (
                <tr 
                  key={index} 
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="text-sm text-white font-mono bg-gray-800 px-3 py-1 rounded-lg">
                      {payment.whatsapp}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-300">
                    {payment.nome || '-'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {payment.payment_method === 'pix' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold">
                        <QrCode className="w-3 h-3" />
                        PIX
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-semibold">
                        <CreditCard className="w-3 h-3" />
                        Cartão
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-semibold text-white">
                    R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-400">
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
          <p className="text-sm text-gray-400">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPayments.length)} de {filteredPayments.length} pagamentos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-300 px-4">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
