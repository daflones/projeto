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
            <tr className="border-b border-gray-700">
              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">WhatsApp</th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">Nome</th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">Data</th>
              <th className="text-right py-4 px-4 text-sm font-semibold text-gray-300">Valor</th>
              <th className="text-center py-4 px-4 text-sm font-semibold text-gray-300">Status</th>
              <th className="text-center py-4 px-4 text-sm font-semibold text-gray-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentLeads.map((lead, index) => (
            <tr 
              key={index} 
              className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
            >
              <td className="py-4 px-4">
                <span className="text-sm text-white font-mono bg-gray-800 px-3 py-1 rounded-lg">
                  {lead.whatsapp}
                </span>
              </td>
              <td className="py-4 px-4 text-sm text-gray-300">
                {lead.nome || '-'}
              </td>
              <td className="py-4 px-4 text-sm text-gray-400">
                {new Date(lead.created_at).toLocaleString('pt-BR')}
              </td>
              <td className="py-4 px-4 text-right text-sm font-semibold text-white">
                {lead.payment_amount ? (
                  `R$ ${lead.payment_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </td>
              <td className="py-4 px-4 text-center">
                {lead.payment_status === 'paid' || lead.payment_confirmed ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                    <Check className="w-3 h-3" />
                    Pago
                  </span>
                ) : lead.payment_status === 'pending' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
                    Pendente
                  </span>
                ) : lead.payment_status === 'expired' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-semibold">
                    <X className="w-3 h-3" />
                    Expirado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
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
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      lead.payment_confirmed
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
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
        <p className="text-sm text-gray-400">
          Mostrando {startIndex + 1} a {Math.min(endIndex, leads.length)} de {leads.length} leads
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

export default LeadsTable
