interface FunnelStep {
  step_name: string
  total_users: number
  conversion_rate: number
}

interface FunnelChartProps {
  data: FunnelStep[]
}

const FunnelChart = ({ data }: FunnelChartProps) => {
  const maxUsers = data[0]?.total_users || 1

  const stepNames: Record<string, string> = {
    landing: 'Página Inicial',
    form_filled: 'Formulário Preenchido',
    analysis_started: 'Análise Iniciada',
    analysis_viewed: 'Resultado Visualizado',
    plans_viewed: 'Planos Visualizados',
    checkout_initiated: 'Checkout Iniciado',
    payment_info_added: 'Dados de Pagamento',
    purchase_completed: 'Compra Concluída'
  }

  const colors = [
    'from-blue-300 to-blue-400',
    'from-cyan-300 to-cyan-400',
    'from-emerald-300 to-emerald-400',
    'from-amber-300 to-amber-400',
    'from-orange-300 to-orange-400',
    'from-rose-300 to-rose-400',
    'from-pink-300 to-pink-400'
  ]

  return (
    <div className="space-y-4">
      {data.map((step, index) => {
        const widthPercentage = (step.total_users / maxUsers) * 100

        return (
          <div key={index} className="group">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-sm font-bold text-rose-500">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  {stepNames[step.step_name] || step.step_name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-400">
                  {step.total_users.toLocaleString()} usuários
                </span>
              </div>
            </div>
            <div className="relative h-12 w-full overflow-hidden rounded-full border border-rose-100 bg-rose-50/60">
              <div
                className={`flex h-full items-center justify-between bg-gradient-to-r ${colors[index]} px-6 text-white transition-all duration-700 ease-out group-hover:opacity-95`}
                style={{ width: `${widthPercentage}%` }}
              >
                <span className="text-sm font-bold">
                  {step.conversion_rate.toFixed(1)}%
                </span>
                {widthPercentage > 30 && (
                  <span className="text-xs font-medium text-white/90">
                    {step.total_users.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FunnelChart
