import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard, QrCode, CheckCircle, Clock, XCircle, Trash2, Loader2 } from 'lucide-react'
import { deletePixPaymentsByIds, deleteCardPaymentsByIds } from '../../services/adminService'

interface PaymentRow {
  id: string
  whatsapp: string
  nome: string
  amount: number
  payment_method: 'pix' | 'card'
  status: 'pending' | 'paid' | 'failed' | 'expired'
  created_at: string
  expires_at?: string | null
  origin: 'pix' | 'card'
}

interface PaymentsTableProps {
  pixPayments: any[]
  cardPayments: any[]
  onRefresh: () => void
}

const PaymentsTable = ({ pixPayments, cardPayments, onRefresh }: PaymentsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'failed' | 'expired'>('all')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const itemsPerPage = 10

  const getRowKey = (payment: PaymentRow) => `${payment.origin}:${payment.id}`

  const allPayments: PaymentRow[] = useMemo(() => (
    [
      ...pixPayments.map<PaymentRow>(p => {
        const expiresAt = p.expires_at ? new Date(p.expires_at).getTime() : null
        const status: PaymentRow['status'] = p.payment_confirmed === true
          ? 'paid'
          : expiresAt !== null && expiresAt <= Date.now()
            ? 'expired'
            : 'pending'

        return {
          id: p.id,
          whatsapp: p.whatsapp || '-',
          nome: p.nome || 'Sem nome',
          amount: p.amount || 0,
          payment_method: 'pix',
          status,
          created_at: p.created_at,
          expires_at: p.expires_at ?? null,
          origin: 'pix'
        }
      }),
      ...cardPayments.map<PaymentRow>(p => ({
        id: p.id,
        whatsapp: p.whatsapp || '-',
        nome: p.nome || p.card_holder || 'Sem nome',
        amount: p.amount || 0,
        payment_method: 'card',
        status: p.payment_confirmed === true ? 'paid' : 'pending',
        created_at: p.created_at,
        origin: 'card'
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  ), [pixPayments, cardPayments])

  useEffect(() => {
    setSelectedRows(prev => {
      const validKeys = new Set(allPayments.map(getRowKey))
      return prev.filter(key => validKeys.has(key))
    })
  }, [allPayments])

  // Filtrar por status
  const filteredPayments = filterStatus === 'all' 
    ? allPayments 
    : allPayments.filter(p => p.status === filterStatus)

  // Paginação
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPayments = filteredPayments.slice(startIndex, endIndex)

  const isRowSelected = (payment: PaymentRow) => selectedRows.includes(getRowKey(payment))
  const areAllSelected = currentPayments.length > 0 && currentPayments.every(payment => isRowSelected(payment))

  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedRows([])
    } else {
      setSelectedRows(prev => {
        const currentKeys = currentPayments.map(payment => getRowKey(payment))
        const newSelection = new Set(prev)
        currentKeys.forEach(key => newSelection.add(key))
        return Array.from(newSelection)
      })
    }
  }

  const toggleRowSelection = (payment: PaymentRow) => {
    const key = getRowKey(payment)
    setSelectedRows(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key])
  }

  const handleDelete = async (keys: string[]) => {
    if (!keys.length) return
    const confirmDelete = window.confirm('Tem certeza que deseja excluir os pagamentos selecionados?')
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const pixIds = keys
        .filter(key => key.startsWith('pix:'))
        .map(key => key.split(':')[1])
      const cardIds = keys
        .filter(key => key.startsWith('card:'))
        .map(key => key.split(':')[1])

      if (pixIds.length) {
        await deletePixPaymentsByIds(pixIds)
      }

      if (cardIds.length) {
        await deleteCardPaymentsByIds(cardIds)
      }

      setSelectedRows(prev => prev.filter(key => !keys.includes(key)))
      onRefresh()
    } finally {
      setIsDeleting(false)
    }
  }

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
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            <Clock className="h-3 w-3" />
            Expirado
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
        <button
          onClick={() => setFilterStatus('expired')}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            filterStatus === 'expired'
              ? 'border-slate-200 bg-slate-600 text-white shadow-sm shadow-slate-300/60'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          Expirados ({allPayments.filter(p => p.status === 'expired').length})
        </button>
      </div>

      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-rose-500">
          <span>{selectedRows.length} pagamento(s) selecionado(s)</span>
          <button
            onClick={() => handleDelete(selectedRows)}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Excluir selecionados
          </button>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rose-100">
              <th className="w-12 py-4 px-4 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                  checked={areAllSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">WhatsApp</th>
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Nome</th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Método</th>
              <th className="py-4 px-4 text-right text-sm font-semibold text-slate-400">Valor</th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Status</th>
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Data</th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Nenhum pagamento encontrado
                </td>
              </tr>
            ) : (
              currentPayments.map(payment => {
                const rowKey = getRowKey(payment)
                return (
                <tr
                  key={rowKey}
                  className="border-b border-rose-50/70 transition-colors hover:bg-rose-50/60"
                >
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                      checked={isRowSelected(payment)}
                      onChange={() => toggleRowSelection(payment)}
                    />
                  </td>
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
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleDelete([rowKey])}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-500 shadow-sm ring-1 ring-inset ring-rose-100 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  </td>
                </tr>
                )
              })
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
