import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessageCircle, Image, Phone, AlertTriangle, CheckCircle } from 'lucide-react'

interface AnalysisStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
  suspicious?: boolean
  count?: number
}

const AnalysisPage = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [analysisData, setAnalysisData] = useState<any>(null)

  const [steps, setSteps] = useState<AnalysisStep[]>([
    {
      id: 'connection',
      title: 'Conectando ao WhatsApp',
      description: 'Estabelecendo conexão segura...',
      icon: <Phone className="w-6 h-6" />,
      completed: false
    },
    {
      id: 'messages',
      title: 'Analisando Mensagens',
      description: 'Escaneando conversas suspeitas...',
      icon: <MessageCircle className="w-6 h-6" />,
      completed: false,
      suspicious: true,
      count: Math.floor(Math.random() * 15) + 5
    },
    {
      id: 'media',
      title: 'Verificando Mídias',
      description: 'Analisando fotos e vídeos compartilhados...',
      icon: <Image className="w-6 h-6" />,
      completed: false,
      suspicious: true,
      count: Math.floor(Math.random() * 8) + 2
    },
    {
      id: 'contacts',
      title: 'Checando Contatos',
      description: 'Identificando contatos suspeitos...',
      icon: <Search className="w-6 h-6" />,
      completed: false,
      suspicious: true,
      count: Math.floor(Math.random() * 5) + 1
    },
    {
      id: 'final',
      title: 'Gerando Relatório',
      description: 'Compilando resultados finais...',
      icon: <CheckCircle className="w-6 h-6" />,
      completed: false
    }
  ])

  useEffect(() => {
    // Verificar se temos dados da análise
    const data = localStorage.getItem('analysisData')
    if (!data) {
      navigate('/')
      return
    }
    setAnalysisData(JSON.parse(data))

    // Simular o processo de análise
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          setSteps(current => 
            current.map((step, index) => 
              index === prev ? { ...step, completed: true } : step
            )
          )
          return prev + 1
        } else {
          // Completar a última etapa
          setSteps(current => 
            current.map((step, index) => 
              index === prev ? { ...step, completed: true } : step
            )
          )
          setIsAnalyzing(false)
          clearInterval(interval)
          return prev
        }
      })
    }, 2500) // Cada etapa demora 2.5 segundos

    return () => clearInterval(interval)
  }, [navigate, steps.length])

  const handleFinishAnalysis = () => {
    // Gerar dados aleatórios para o resultado
    const suspiciousFindings = {
      messages: steps[1].count || 0,
      media: steps[2].count || 0,
      contacts: steps[3].count || 0,
      riskLevel: Math.random() > 0.3 ? 'high' : 'medium' // 70% chance de alto risco
    }

    localStorage.setItem('analysisResults', JSON.stringify(suspiciousFindings))
    
    // Scroll para o topo antes de navegar
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Pequeno delay para o scroll completar
    setTimeout(() => {
      navigate('/pagamento')
    }, 300)
  }

  if (!analysisData) {
    return <div>Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="glass-card border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold title-premium mb-2">
                🔍 Análise em Andamento
              </h1>
              <p className="text-gray-300">
                Sistema de detecção avançado ativo
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Analisando:</div>
              <div className="text-xl font-bold text-white">{analysisData.targetName}</div>
              <div className="text-sm text-gray-400">{analysisData.whatsapp}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="glass-card p-8 mb-8 warning-glow">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/50 animate-pulse">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🔍</span>
                    </div>
                  </div>
                  <div className="absolute -inset-2 bg-red-500/20 rounded-full animate-ping"></div>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold mb-4 title-premium">
                🔍 Analisando WhatsApp
              </h2>
              <p className="text-gray-300 text-lg">
                Verificando atividades suspeitas de <span className="text-red-400 font-bold">{analysisData.targetName}</span>
              </p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-300 mb-3">
                <span className="font-semibold">Progresso da Análise</span>
                <span className="text-red-400 font-bold">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-500 via-red-400 to-orange-500 h-4 rounded-full transition-all duration-500 relative"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Analysis Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`relative flex items-center p-6 rounded-2xl border-2 transition-all duration-500 ${
                    index === currentStep && isAnalyzing
                      ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/25'
                      : step.completed
                      ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/25'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className={`relative p-4 rounded-full mr-6 ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : index === currentStep && isAnalyzing
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="w-8 h-8" />
                    ) : index === currentStep && isAnalyzing ? (
                      <div className="animate-spin">
                        {step.icon}
                      </div>
                    ) : (
                      step.icon
                    )}
                    
                    {index === currentStep && isAnalyzing && (
                      <div className="absolute -inset-1 bg-blue-500/30 rounded-full animate-ping"></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-300 text-lg">
                      {step.description}
                    </p>
                  </div>

                  {step.completed && step.suspicious && (
                    <div className="text-right">
                      <div className="flex items-center text-red-400 font-bold text-xl mb-1">
                        <AlertTriangle className="w-6 h-6 mr-2" />
                        {step.count}
                      </div>
                      <p className="text-red-300 text-sm font-semibold">ENCONTRADOS</p>
                    </div>
                  )}

                  {step.completed && !step.suspicious && (
                    <div className="text-green-400">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                  )}

                  {index === currentStep && isAnalyzing && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                      EM ANDAMENTO
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Results Preview */}
            {!isAnalyzing && (
              <div className="mt-8 glass-card p-8 warning-glow">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/50">
                      <AlertTriangle className="w-16 h-16 text-red-400" />
                    </div>
                    <div className="absolute -inset-2 bg-red-500/20 rounded-full animate-ping"></div>
                  </div>
                  
                  <h3 className="text-4xl font-bold mb-4 title-premium neon-red">
                    ⚠️ ATIVIDADE SUSPEITA DETECTADA!
                  </h3>
                  <p className="text-red-300 text-xl mb-8">
                    Encontramos evidências que podem indicar comportamento suspeito.
                  </p>

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
                      <div className="text-4xl font-bold text-red-400 mb-2">
                        {steps[1].count}
                      </div>
                      <div className="text-white font-semibold">
                        Mensagens Suspeitas
                      </div>
                      <div className="text-red-300 text-sm mt-1">
                        Detectadas
                      </div>
                    </div>
                    <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
                      <div className="text-4xl font-bold text-red-400 mb-2">
                        {steps[2].count}
                      </div>
                      <div className="text-white font-semibold">
                        Mídias Comprometedoras
                      </div>
                      <div className="text-red-300 text-sm mt-1">
                        Encontradas
                      </div>
                    </div>
                    <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
                      <div className="text-4xl font-bold text-red-400 mb-2">
                        {steps[3].count}
                      </div>
                      <div className="text-white font-semibold">
                        Contatos Suspeitos
                      </div>
                      <div className="text-red-300 text-sm mt-1">
                        Identificados
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleFinishAnalysis}
                    className="btn-primary text-2xl py-6 px-12 mb-4"
                  >
                    📋 VER RELATÓRIO COMPLETO
                  </button>

                  <p className="text-gray-400 text-lg">
                    Clique para acessar todos os detalhes e evidências encontradas
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="glass-card p-8 text-center floating-element">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="bg-green-500/20 p-4 rounded-full border-2 border-green-500/50">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-pulse"></div>
              </div>
            </div>
            <h3 className="font-bold text-2xl text-white mb-4">
              🔒 Análise 100% Segura e Anônima
            </h3>
            <p className="text-gray-300 text-lg">
              Seus dados são criptografados e não são armazenados em nossos servidores.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center justify-center text-green-400">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">Criptografado</span>
              </div>
              <div className="flex items-center justify-center text-blue-400">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">Anônimo</span>
              </div>
              <div className="flex items-center justify-center text-purple-400">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalysisPage
