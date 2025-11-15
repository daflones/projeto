import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react'
import { useAdmin } from '../contexts/AdminContext'

const AdminLoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAdmin()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const success = await login(formData.email, formData.password)
      
      if (success) {
        navigate('/admin-page')
      } else {
        setError('Email ou senha incorretos')
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-rose-50 via-white to-rose-50 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-rose-100 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-pink-200/60 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-200/80">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">
            Painel Administrativo
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-rose-500">
            <Sparkles className="h-4 w-4" />
            Acesso restrito - Administradores
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl border border-rose-100 bg-white/90 p-8 shadow-xl shadow-rose-100/70 backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-rose-300 transition-colors group-focus-within:text-rose-500" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-rose-100 bg-white/80 py-3 pl-12 pr-4 text-slate-700 placeholder-slate-400 shadow-inner focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="admin@exemplo.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Senha
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-rose-300 transition-colors group-focus-within:text-rose-500" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-rose-100 bg-white/80 py-3 pl-12 pr-4 text-slate-700 placeholder-slate-400 shadow-inner focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 animate-shake">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
                <p className="text-sm font-medium text-rose-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg shadow-rose-200/70 transition-transform hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to site */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm font-medium text-slate-400 transition-colors hover:text-rose-500"
          >
            ← Voltar ao site
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}

export default AdminLoginPage
