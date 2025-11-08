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
    'from-blue-500 to-blue-600',
    'from-cyan-500 to-cyan-600',
    'from-green-500 to-green-600',
    'from-yellow-500 to-yellow-600',
    'from-orange-500 to-orange-600',
    'from-red-500 to-red-600',
    'from-pink-500 to-pink-600'
  ]

  return (
    <div className="space-y-4">
      {data.map((step, index) => {
        const widthPercentage = (step.total_users / maxUsers) * 100

        return (
          <div key={index} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-white text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-white">
                  {stepNames[step.step_name] || step.step_name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  {step.total_users.toLocaleString()} usuários
                </span>
              </div>
            </div>
            <div className="relative w-full bg-gray-800 rounded-full h-12 overflow-hidden border border-gray-700">
              <div
                className={`h-full bg-gradient-to-r ${colors[index]} flex items-center justify-between px-6 transition-all duration-700 ease-out group-hover:opacity-90`}
                style={{ width: `${widthPercentage}%` }}
              >
                <span className="text-sm font-bold text-white">
                  {step.conversion_rate.toFixed(1)}%
                </span>
                {widthPercentage > 30 && (
                  <span className="text-xs text-white/80">
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
