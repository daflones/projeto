import { useState, useMemo } from 'react'
import { Check, X, Loader2, ChevronLeft, ChevronRight, Trash2, Search, Copy } from 'lucide-react'
import { updateLeadPaymentStatus, deleteLeadsByIds } from '../../services/adminService'

interface Lead {
  id: string
  whatsapp: string
  nome?: string
  created_at: string
  payment_id: string
  payment_confirmed?: boolean
  payment_status?: string
  payment_amount?: number
  selected_plan?: string
  plan_name?: string
}

interface LeadsTableProps {
  leads: Lead[]
  onUpdate: () => void
}

type FilterType = 'all' | 'paid' | 'pending' | 'expired' | 'no_payment'

const LeadsTable = ({ leads, onUpdate }: LeadsTableProps) => {
  const [updating, setUpdating] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterType>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const itemsPerPage = 15

  const filteredLeads = useMemo(() => {
    let result = leads

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(lead =>
        lead.whatsapp?.toLowerCase().includes(q) ||
        lead.nome?.toLowerCase().includes(q)
      )
    }

    if (filterStatus !== 'all') {
      result = result.filter(lead => lead.payment_status === filterStatus)
    }

    return result
  }, [leads, searchQuery, filterStatus])

  const statusCounts = useMemo(() => ({
    all: leads.length,
    paid: leads.filter(l => l.payment_status === 'paid' || l.payment_confirmed).length,
    pending: leads.filter(l => l.payment_status === 'pending').length,
    expired: leads.filter(l => l.payment_status === 'expired').length,
    no_payment: leads.filter(l => l.payment_status === 'no_payment').length,
  }), [leads])

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLeads = filteredLeads.slice(startIndex, endIndex)

  const getRowKey = (lead: Lead) => lead.id
  const isRowSelected = (lead: Lead) => selectedRows.includes(getRowKey(lead))
  const areAllSelected = currentLeads.length > 0 && currentLeads.every(isRowSelected)

  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedRows([])
    } else {
      setSelectedRows(prev => {
        const currentKeys = currentLeads.map(getRowKey)
        const newSelection = new Set(prev)
        currentKeys.forEach(key => newSelection.add(key))
        return Array.from(newSelection)
      })
    }
  }

  const toggleRowSelection = (lead: Lead) => {
    const key = getRowKey(lead)
    setSelectedRows(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key])
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleDelete = async (keys: string[]) => {
    if (!keys.length) return
    const confirmDelete = window.confirm('Tem certeza que deseja excluir os leads selecionados?')
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const success = await deleteLeadsByIds(keys)
      if (success) {
        setSelectedRows(prev => prev.filter(key => !keys.includes(key)))
        onUpdate()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTogglePayment = async (paymentId: string, currentStatus: boolean) => {
    setUpdating(paymentId)
    try {
      const success = await updateLeadPaymentStatus(paymentId, !currentStatus)
      if (success) {
        onUpdate()
      }
    } finally {
      setUpdating(null)
    }
  }

  const getPlanLabel = (lead: Lead) => {
    if (lead.selected_plan === 'premium' || lead.plan_name === 'premium') return 'Vitalício'
    if (lead.selected_plan === 'basic' || lead.plan_name === 'basic') return 'Completa'
    if (lead.payment_amount) {
      if (lead.payment_amount >= 40) return 'Vitalício'
      return 'Completa'
    }
    return '-'
  }

  const handleFilterChange = (filter: FilterType) => {
    setFilterStatus(filter)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            placeholder="Buscar por WhatsApp ou nome..."
            className="w-full rounded-xl border border-rose-100 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-600 placeholder-slate-400 shadow-inner focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: 'all' as FilterType, label: 'Todos', count: statusCounts.all, colors: 'border-rose-200 bg-rose-500 text-white shadow-sm shadow-rose-200/60', inactiveColors: 'border-rose-100 bg-white text-rose-400 hover:bg-rose-50' },
            { key: 'paid' as FilterType, label: 'Pagos', count: statusCounts.paid, colors: 'border-emerald-200 bg-emerald-500 text-white shadow-sm shadow-emerald-200/50', inactiveColors: 'border-emerald-100 bg-white text-emerald-500 hover:bg-emerald-50' },
            { key: 'pending' as FilterType, label: 'Pendentes', count: statusCounts.pending, colors: 'border-amber-200 bg-amber-500 text-white shadow-sm shadow-amber-200/50', inactiveColors: 'border-amber-100 bg-white text-amber-500 hover:bg-amber-50' },
            { key: 'expired' as FilterType, label: 'Expirados', count: statusCounts.expired, colors: 'border-slate-200 bg-slate-600 text-white shadow-sm shadow-slate-300/60', inactiveColors: 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50' },
            { key: 'no_payment' as FilterType, label: 'Sem Pagamento', count: statusCounts.no_payment, colors: 'border-rose-200 bg-rose-500 text-white shadow-sm shadow-rose-200/60', inactiveColors: 'border-rose-100 bg-white text-rose-500 hover:bg-rose-50' },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${filterStatus === f.key ? f.colors : f.inactiveColors}`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-rose-500">
          <span>{selectedRows.length} lead(s) selecionado(s)</span>
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
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Plano</th>
              <th className="py-4 px-4 text-right text-sm font-semibold text-slate-400">Valor</th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Status</th>
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Data</th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentLeads.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  {searchQuery || filterStatus !== 'all'
                    ? 'Nenhum lead encontrado com os filtros aplicados'
                    : 'Nenhum lead cadastrado'}
                </td>
              </tr>
            ) : (
              currentLeads.map(lead => (
                <tr
                  key={lead.id}
                  className="border-b border-rose-50/70 transition-colors hover:bg-rose-50/60"
                >
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                      checked={isRowSelected(lead)}
                      onChange={() => toggleRowSelection(lead)}
                    />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-lg bg-rose-50 px-3 py-1 font-mono text-sm font-medium text-rose-500">
                        {lead.whatsapp}
                      </span>
                      <button
                        onClick={() => handleCopy(lead.whatsapp, `wpp-${lead.id}`)}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                        title="Copiar"
                      >
                        {copiedId === `wpp-${lead.id}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-slate-500">
                    {lead.nome || '-'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getPlanLabel(lead) !== '-' ? (
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        getPlanLabel(lead) === 'Vitalício'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        {getPlanLabel(lead)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-semibold text-slate-600">
                    {lead.payment_amount ? (
                      `R$ ${lead.payment_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {lead.payment_status === 'paid' || lead.payment_confirmed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                        <Check className="h-3 w-3" />
                        Pago
                      </span>
                    ) : lead.payment_status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                        Pendente
                      </span>
                    ) : lead.payment_status === 'expired' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        <X className="h-3 w-3" />
                        Expirado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                        <X className="h-3 w-3" />
                        Sem Pagamento
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-slate-400">
                    {new Date(lead.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {lead.payment_status !== 'no_payment' && lead.payment_id ? (
                        <button
                          onClick={() => handleTogglePayment(lead.payment_id, lead.payment_confirmed || false)}
                          disabled={updating === lead.payment_id}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            lead.payment_confirmed
                              ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {updating === lead.payment_id ? (
                            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                          ) : lead.payment_confirmed ? (
                            'Pendente'
                          ) : (
                            'Pago'
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                      <button
                        onClick={() => handleDelete([getRowKey(lead)])}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-500 shadow-sm ring-1 ring-inset ring-rose-100 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-slate-400">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredLeads.length)} de {filteredLeads.length} leads
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

export default LeadsTable
