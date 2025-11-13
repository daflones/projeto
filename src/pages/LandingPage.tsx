import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Shield, AlertTriangle } from 'lucide-react'
import { saveLead } from '../services/supabase'
import { useMetaPixel } from '../hooks/useMetaPixel'
import { useAnalytics } from '../hooks/useAnalytics'

interface FormData {
  whatsapp: string
}

const LandingPage = () => {
  const navigate = useNavigate()
  const { trackEvent } = useMetaPixel()
  const { trackEvent: trackAnalytics, trackFunnel } = useAnalytics()
  const [formData, setFormData] = useState<FormData>({
    whatsapp: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  // Rastreia visualização da landing page
  useEffect(() => {
    // Meta Pixel
    trackEvent('ViewContent', {
      content_name: 'Landing Page',
      content_category: 'Home'
    })
    
    // Analytics no banco
    trackAnalytics('page_view', 'Landing Page', '/')
    trackFunnel('landing', 1)
  }, [trackEvent, trackAnalytics, trackFunnel])

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
    
    // Rastreia evento de Lead (formulário preenchido)
    // Meta Pixel
    trackEvent('Lead', {
      content_name: 'WhatsApp Form Submission',
      content_category: 'Lead Generation'
    })
    
    // Analytics no banco
    trackAnalytics('lead', 'Form Submission', '/', cleanWhatsapp)
    trackFunnel('form_filled', 2, cleanWhatsapp)
    
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
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-red-50 via-pink-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-5xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-red-500 p-5 rounded-2xl shadow-lg">
                <AlertTriangle className="w-16 h-16 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              DESCUBRA SE SEU PARCEIRO<br />
              <span className="text-red-600">ESTÁ TE TRAINDO!</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-10 text-gray-700 font-semibold" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Análise <span className="text-red-600">COMPLETA</span> do WhatsApp em menos de <span className="text-red-600">2 minutos</span>
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-xl transition-all duration-300">
                <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-blue-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-900">Análise Profunda</h3>
                <p className="text-gray-600 text-sm">Escaneamos todas as conversas suspeitas</p>
              </div>
              
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-green-500 hover:shadow-xl transition-all duration-300">
                <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-green-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-900">100% Seguro</h3>
                <p className="text-gray-600 text-sm">Seus dados são totalmente protegidos</p>
              </div>
              
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-red-500 hover:shadow-xl transition-all duration-300">
                <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-red-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-900">Resultados Reais</h3>
                <p className="text-gray-600 text-sm">Descubra a verdade agora mesmo</p>
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
              <h2 className="text-3xl font-bold mb-4 text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Comece Sua Análise GRATUITA
              </h2>
              <p className="text-gray-700">
                Informe o número do WhatsApp para iniciar a verificação
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  WhatsApp para Análise *
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
                  <p className="text-sm text-red-600 mt-2 font-semibold">
                    {phoneError}
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
                    INICIANDO ANÁLISE...
                  </div>
                ) : (
                  <>
                    <Search className="w-5 h-5 inline mr-2" />
                    INICIAR ANÁLISE GRATUITA
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-green-500" />
                  Dados Seguros
                </div>
                <div className="flex items-center">
                  <Search className="w-4 h-4 mr-2 text-blue-500" />
                  Análise Rápida
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            O que nossos usuários dizem
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="glass-card p-6 ">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center border border-pink-500/30">
                  <span className="text-2xl font-bold text-pink-600">A</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-gray-800">Ana M.</h4>
                  <div className="text-sm text-gray-600 font-medium">5/5 estrelas</div>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "Descobri que meu ex estava me traindo há meses. Essa ferramenta me salvou de mais sofrimento!"
              </p>
            </div>

            <div className="glass-card p-6 ">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                  <span className="text-2xl font-bold text-blue-600">C</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-gray-800">Carlos R.</h4>
                  <div className="text-sm text-gray-600 font-medium">5/5 estrelas</div>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "Rápido e eficiente. Em 2 minutos eu tinha todas as provas que precisava."
              </p>
            </div>

            <div className="glass-card p-6 ">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                  <span className="text-2xl font-bold text-green-600">M</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-gray-800">Mariana S.</h4>
                  <div className="text-sm text-gray-600 font-medium">5/5 estrelas</div>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "Finalmente consegui a paz de espírito que precisava. Recomendo!"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-gray-200 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h4 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Detector de Traição
              </h4>
              <p className="text-gray-600 text-sm">
                A ferramenta mais avançada para descobrir a verdade
              </p>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>100% Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-500" />
                <span>Análise Rápida</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
              © 2024 Detector de Traição. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
