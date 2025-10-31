import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Shield, AlertTriangle, Heart } from 'lucide-react'
import { saveLead } from '../services/supabase'

interface FormData {
  whatsapp: string
}

const LandingPage = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    whatsapp: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  // Função para formatar telefone brasileiro
  const formatPhoneNumber = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11)
    
    // Aplica a máscara (11) 99999-9999
    if (limited.length <= 2) {
      return limited
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
    }
  }

  // Função para validar número brasileiro
  const validatePhoneNumber = (phone: string): boolean => {
    const numbers = phone.replace(/\D/g, '')
    
    // Deve ter exatamente 11 dígitos (2 DDD + 9 celular)
    if (numbers.length !== 11) {
      return false
    }
    
    // DDD deve ser válido (11-99)
    const ddd = parseInt(numbers.slice(0, 2))
    if (ddd < 11 || ddd > 99) {
      return false
    }
    
    // Celular deve começar com 9
    const firstDigit = numbers.charAt(2)
    if (firstDigit !== '9') {
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.whatsapp) {
      setPhoneError('Por favor, informe o número do WhatsApp')
      return
    }

    if (!validatePhoneNumber(formData.whatsapp)) {
      setPhoneError('Número inválido! Use o formato (11) 99999-9999')
      return
    }

    setPhoneError('')
    setIsLoading(true)
    
    // Salvar lead no banco de dados
    const cleanWhatsapp = formData.whatsapp.replace(/\D/g, '')
    await saveLead(cleanWhatsapp)
    
    // Salvar dados no localStorage para usar nas próximas páginas
    localStorage.setItem('analysisData', JSON.stringify({
      ...formData,
      whatsapp: cleanWhatsapp
    }))
    
    // Simular um pequeno delay para parecer mais real
    setTimeout(() => {
      navigate('/analise')
    }, 1500)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    if (name === 'whatsapp') {
      // Aplica a máscara e atualiza
      const formatted = formatPhoneNumber(value)
      setFormData({
        ...formData,
        [name]: formatted
      })
      
      // Limpa erro ao digitar
      if (phoneError) {
        setPhoneError('')
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="danger-gradient text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-white/20 p-4 rounded-full">
                <AlertTriangle className="w-16 h-16 text-yellow-300" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight title-premium text-center mx-auto max-w-5xl">
              ⚠️ DESCUBRA SE SEU PARCEIRO ESTÁ TE TRAINDO! ⚠️
            </h1>
            
            <p className="text-xl md:text-2xl mb-10 opacity-90 text-center max-w-3xl mx-auto">
              Análise COMPLETA do WhatsApp em menos de 2 minutos
            </p>
            
            <div className="glass-card p-8 mb-8 floating-element">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="bg-white/10 p-4 rounded-full mb-4 scan-line">
                    <Search className="w-12 h-12 text-yellow-300" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">🔍 Análise Profunda</h3>
                  <p className="text-sm opacity-80">Escaneamos conversas suspeitas</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-white/10 p-4 rounded-full mb-4 scan-line">
                    <Shield className="w-12 h-12 text-green-300" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">🛡️ 100% Seguro</h3>
                  <p className="text-sm opacity-80">Seus dados são protegidos</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-white/10 p-4 rounded-full mb-4 scan-line">
                    <Heart className="w-12 h-12 text-red-300" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Resultados Reais</h3>
                  <p className="text-sm opacity-80">Descubra a verdade agora</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="glass-card p-8 warning-glow">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4 title-premium">
                🚀 Comece Sua Análise GRATUITA
              </h2>
              <p className="text-gray-300">
                Informe o número do WhatsApp para iniciar a verificação
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  📱 WhatsApp para Análise *
                </label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                  className={`input-field ${phoneError ? 'border-red-500 border-2' : ''}`}
                  required
                  maxLength={15}
                />
                {phoneError ? (
                  <p className="text-sm text-red-400 mt-2 font-semibold">
                    ⚠️ {phoneError}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">
                    Digite o número do WhatsApp que você suspeita (apenas números brasileiros)
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    🔄 INICIANDO ANÁLISE...
                  </div>
                ) : (
                  '🔍 INICIAR ANÁLISE GRATUITA'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-green-400" />
                  🔒 Dados Seguros
                </div>
                <div className="flex items-center">
                  <Search className="w-4 h-4 mr-2 text-blue-400" />
                  ⚡ Análise Rápida
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 title-premium">
            💬 O que nossos usuários dizem
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="glass-card p-6 floating-element">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center border border-pink-500/30">
                  <span className="text-2xl">👩</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-white">Ana M.</h4>
                  <div className="text-yellow-400">⭐⭐⭐⭐⭐</div>
                </div>
              </div>
              <p className="text-gray-300 italic">
                "Descobri que meu ex estava me traindo há meses. Essa ferramenta me salvou de mais sofrimento!"
              </p>
            </div>

            <div className="glass-card p-6 floating-element">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                  <span className="text-2xl">👨</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-white">Carlos R.</h4>
                  <div className="text-yellow-400">⭐⭐⭐⭐⭐</div>
                </div>
              </div>
              <p className="text-gray-300 italic">
                "Rápido e eficiente. Em 2 minutos eu tinha todas as provas que precisava."
              </p>
            </div>

            <div className="glass-card p-6 floating-element">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                  <span className="text-2xl">👩</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-white">Mariana S.</h4>
                  <div className="text-yellow-400">⭐⭐⭐⭐⭐</div>
                </div>
              </div>
              <p className="text-gray-300 italic">
                "Finalmente consegui a paz de espírito que precisava. Recomendo!"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 border-t border-gray-700">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6">
            <h4 className="text-2xl font-bold title-premium mb-2">🔍 Detector de Traição</h4>
            <p className="text-gray-400">
              A ferramenta mais avançada para descobrir a verdade
            </p>
          </div>
          <p className="text-gray-400 mb-2">
            © 2024 Detector de Traição. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
