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
    <div className="group relative overflow-hidden rounded-[1.9rem] border border-white/80 bg-white/90 p-6 shadow-lg shadow-rose-100/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-rose-200/60">
      <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-rose-100/70 via-pink-100/50 to-transparent blur-3xl transition-opacity duration-500 group-hover:opacity-100"></div>
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-gradient-to-br from-white via-amber-100/60 to-transparent blur-3xl opacity-60"></div>

      <div className="relative mb-6 flex items-start justify-between">
        <div
          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-rose-500 shadow-sm shadow-rose-100/30 transition-transform duration-300 group-hover:scale-105 ${iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div
            className={`inline-flex items-center gap-2 rounded-full border border-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
              trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            <span className="text-base leading-none">{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      <div className="relative space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-400">{title}</p>
        <p className="text-3xl font-bold text-slate-900 md:text-4xl">{value}</p>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

export default StatsCard
