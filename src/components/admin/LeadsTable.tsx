import { useState } from 'react'
import { Check, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
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
        <table className="w-full">
          <thead>
            <tr className="border-b border-rose-100">
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">WhatsApp</th>
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Nome</th>
              <th className="py-4 px-4 text-left text-sm font-semibold text-slate-400">Data</th>
              <th className="py-4 px-4 text-right text-sm font-semibold text-slate-400">Valor</th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Status</th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-slate-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentLeads.map((lead, index) => (
              <tr
                key={index}
                className="border-b border-rose-50/70 transition-colors hover:bg-rose-50/60"
              >
                <td className="py-4 px-4">
                  <span className="rounded-lg bg-rose-50 px-3 py-1 font-mono text-sm font-medium text-rose-500">
                    {lead.whatsapp}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm font-medium text-slate-500">
                  {lead.nome || '-'}
                </td>
                <td className="py-4 px-4 text-sm font-medium text-slate-400">
                  {new Date(lead.created_at).toLocaleString('pt-BR')}
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
                <td className="py-4 px-4 text-center">
                  {lead.payment_status !== 'no_payment' && lead.payment_id ? (
                    <button
                      onClick={() => handleTogglePayment(lead.payment_id, lead.payment_confirmed || false)}
                      disabled={updating === lead.payment_id}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                        lead.payment_confirmed
                          ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {updating === lead.payment_id ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      ) : lead.payment_confirmed ? (
                        'Marcar Pendente'
                      ) : (
                        'Marcar Pago'
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-slate-400">
            Mostrando {startIndex + 1} a {Math.min(endIndex, leads.length)} de {leads.length} leads
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
