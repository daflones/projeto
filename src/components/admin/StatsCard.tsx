import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

const StatsCard = ({ title, value, subtitle, icon: Icon, iconColor, trend }: StatsCardProps) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-rose-100 bg-white/95 p-6 shadow-lg shadow-rose-100/40 transition-transform duration-300 hover:-translate-y-1">
      <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-rose-100/60 blur-2xl"></div>
      <div className="flex items-start justify-between mb-6">
        <div className={`inline-flex items-center justify-center rounded-2xl p-3 text-rose-500 shadow-sm ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">{title}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

export default StatsCard
