import { useState } from 'react'
import { Check, X, Loader2, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { updateLeadPaymentStatus } from '../../services/adminService'

interface Lead {
  id: string
  whatsapp: string
  nome?: string
  created_at: string
  payment_id: string
  payment_confirmed?: boolean
  payment_status?: string
  payment_amount?: number
}

interface LeadsTableProps {
  leads: Lead[]
  onUpdate: () => void
}

const LeadsTable = ({ leads, onUpdate }: LeadsTableProps) => {
  const [updating, setUpdating] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Paginação
  const totalPages = Math.ceil(leads.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLeads = leads.slice(startIndex, endIndex)

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

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rose-100/70 bg-white text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <th className="py-4 px-4">WhatsApp</th>
              <th className="py-4 px-4">Nome</th>
              <th className="py-4 px-4">Data</th>
              <th className="py-4 px-4 text-right">Valor</th>
              <th className="py-4 px-4 text-center">Status</th>
              <th className="py-4 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentLeads.map((lead, index) => (
            <tr 
              key={index} 
              className="border-b border-rose-100/60 text-slate-600 transition-colors hover:bg-rose-50/50"
            >
              <td className="py-4 px-4">
                <span className="font-mono text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                  {lead.whatsapp}
                </span>
              </td>
              <td className="py-4 px-4">
                {lead.nome || '-'}
              </td>
              <td className="py-4 px-4 text-slate-500">
                {new Date(lead.created_at).toLocaleString('pt-BR')}
              </td>
              <td className="py-4 px-4 text-right text-sm font-semibold text-slate-900">
                {lead.payment_amount ? (
                  <span>R$ {lead.payment_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
              <td className="py-4 px-4 text-center">
                {lead.payment_status === 'paid' || lead.payment_confirmed ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 font-semibold">
                    <Check className="w-3 h-3" />
                    Pago
                  </span>
                ) : lead.payment_status === 'pending' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-600 font-semibold">
                    <Clock className="w-3 h-3" />
                    Pendente
                  </span>
                ) : lead.payment_status === 'expired' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold">
                    <X className="w-3 h-3" />
                    Expirado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-600 font-semibold">
                    <X className="w-3 h-3" />
                    Sem Pagamento
                  </span>
                )}
              </td>
              <td className="py-4 px-4 text-center">
                {/* Só mostra botão se houver pagamento (não for no_payment) */}
                {lead.payment_status !== 'no_payment' && lead.payment_id ? (
                  <button
                    onClick={() => handleTogglePayment(lead.payment_id, lead.payment_confirmed || false)}
                    disabled={updating === lead.payment_id}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                      lead.payment_confirmed
                        ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {updating === lead.payment_id ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : lead.payment_confirmed ? (
                      'Marcar Pendente'
                    ) : (
                      'Marcar Pago'
                    )}
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Paginação */}
    {totalPages > 1 && (
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-slate-500">
          Mostrando {startIndex + 1} a {Math.min(endIndex, leads.length)} de {leads.length} leads
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

export default LeadsTable
