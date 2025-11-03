import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessageCircle, Image, Phone, AlertTriangle, CheckCircle } from 'lucide-react'
import { updateLeadName, saveAnalysisResults, getAnalysisResults } from '../services/supabase'

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('')
  const [profileData, setProfileData] = useState<any>(null)

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

  // Função para buscar foto de perfil
  const fetchProfilePicture = async (number: string) => {
    try {
      const apiUrl = import.meta.env.VITE_EVOLUTION_API_URL
      const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY
      const instance = import.meta.env.VITE_EVOLUTION_INSTANCE

      if (!apiUrl || !apiKey || !instance) {
        console.warn('Evolution API não configurada')
        return
      }

      const response = await fetch(`${apiUrl}/chat/fetchProfilePictureUrl/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({ number })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.profilePictureUrl) {
          setProfilePictureUrl(data.profilePictureUrl)
        }
      } else {
        const errorData = await response.text()
        console.error('Erro ao buscar foto (status ' + response.status + '):', errorData)
      }
    } catch (error) {
      console.error('Erro ao buscar foto de perfil:', error)
    }
  }

  // Função para buscar dados do perfil
  const fetchProfile = async (number: string) => {
    try {
      const apiUrl = import.meta.env.VITE_EVOLUTION_API_URL
      const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY
      const instance = import.meta.env.VITE_EVOLUTION_INSTANCE

      if (!apiUrl || !apiKey || !instance) {
        console.warn('Evolution API não configurada')
        return
      }

      const response = await fetch(`${apiUrl}/chat/fetchProfile/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({ number })
      })

      if (response.ok) {
        const data = await response.json()
        setProfileData(data)
        
        // Salvar nome no banco de dados se disponível
        if (data && (data.name || data.pushName || data.verifiedName)) {
          const nome = data.name || data.pushName || data.verifiedName
          const whatsapp = analysisData?.whatsapp || number
          const cleanWhatsapp = whatsapp.replace(/\D/g, '')
          
          // Atualizar o nome no lead
          await updateLeadName(cleanWhatsapp, nome)
        }
      } else {
        const errorData = await response.text()
        console.error('Erro ao buscar perfil (status ' + response.status + '):', errorData)
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
    }
  }

  useEffect(() => {
    const loadAnalysisData = async () => {
      // Verificar se temos dados da análise
      const data = localStorage.getItem('analysisData')
      if (!data) {
        navigate('/')
        return
      }
      const parsedData = JSON.parse(data)
      setAnalysisData(parsedData)

      // Buscar análise anterior do banco de dados ANTES de iniciar o intervalo
      if (parsedData.whatsapp) {
        const cleanWhatsapp = parsedData.whatsapp.replace(/\D/g, '')
        console.log('🔍 Buscando análise anterior para:', cleanWhatsapp)
        
        const previousAnalysis = await getAnalysisResults(cleanWhatsapp)
        console.log('📊 Análise anterior encontrada:', previousAnalysis)

        // Se encontrou análise anterior, incrementar os números
        if (previousAnalysis.success && previousAnalysis.data) {
          const prev = previousAnalysis.data
          console.log('✨ Incrementando números da análise anterior:', prev)
          
          // Incrementar garantindo um mínimo de +2 em cada campo
          const incrementMessages = Math.max(2, Math.floor(prev.messages_count * 0.25))
          const incrementMedia = Math.max(2, Math.floor(prev.media_count * 0.25))
          const incrementContacts = Math.max(1, Math.floor(prev.contacts_count * 0.25))
          
          const newMessagesCount = prev.messages_count + incrementMessages
          const newMediaCount = prev.media_count + incrementMedia
          const newContactsCount = prev.contacts_count + incrementContacts
          
          console.log('📈 Incrementos aplicados:', {
            messages: `${prev.messages_count} + ${incrementMessages} = ${newMessagesCount}`,
            media: `${prev.media_count} + ${incrementMedia} = ${newMediaCount}`,
            contacts: `${prev.contacts_count} + ${incrementContacts} = ${newContactsCount}`
          })
          
          // Atualizar os steps ANTES do intervalo começar
          setSteps(current => current.map(step => {
            if (step.id === 'messages') {
              console.log('🔄 Atualizando step messages para:', newMessagesCount)
              return { ...step, count: newMessagesCount }
            }
            if (step.id === 'media') {
              console.log('🔄 Atualizando step media para:', newMediaCount)
              return { ...step, count: newMediaCount }
            }
            if (step.id === 'contacts') {
              console.log('🔄 Atualizando step contacts para:', newContactsCount)
              return { ...step, count: newContactsCount }
            }
            return step
          }))
        } else {
          console.log('🆕 Primeira análise deste número - usando valores aleatórios')
        }

        // Remover formatação do número (deixar apenas dígitos)
        let cleanNumber = parsedData.whatsapp.replace(/\D/g, '')
        
        // Garantir que tem código do país (55 para Brasil)
        if (!cleanNumber.startsWith('55')) {
          cleanNumber = '55' + cleanNumber
        }
        
        // Buscar perfil e foto
        fetchProfilePicture(cleanNumber)
        fetchProfile(cleanNumber)
      }

      // AGUARDAR um pouco antes de iniciar o intervalo para garantir que os steps foram atualizados
      await new Promise(resolve => setTimeout(resolve, 100))

      // Simular o processo de análise
      intervalRef.current = setInterval(() => {
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
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
            return prev
          }
        })
      }, 2500) // Cada etapa demora 2.5 segundos
    }

    loadAnalysisData()
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [navigate])

  const handleFinishAnalysis = async () => {
    console.log('🔍 handleFinishAnalysis chamado!')
    console.log('📊 Steps:', steps)
    
    // Gerar dados aleatórios para o resultado
    const messagesCount = steps[1].count || 0
    const mediaCount = steps[2].count || 0
    const contactsCount = steps[3].count || 0
    const riskLevel = Math.random() > 0.3 ? 'high' : 'medium' // 70% chance de alto risco

    console.log('📈 Números extraídos:', {
      messages: messagesCount,
      media: mediaCount,
      contacts: contactsCount,
      riskLevel
    })

    const suspiciousFindings = {
      messages: messagesCount,
      media: mediaCount,
      contacts: contactsCount,
      riskLevel
    }

    localStorage.setItem('analysisResults', JSON.stringify(suspiciousFindings))
    console.log('💾 Dados salvos no localStorage')
    
    // Salvar resultados da análise no banco de dados
    if (analysisData?.whatsapp) {
      const cleanWhatsapp = analysisData.whatsapp.replace(/\D/g, '')
      console.log('📱 Salvando análise para WhatsApp:', cleanWhatsapp)
      console.log('Dados completos:', {
        whatsapp: cleanWhatsapp,
        messages: messagesCount,
        media: mediaCount,
        contacts: contactsCount,
        riskLevel
      })
      
      const result = await saveAnalysisResults(
        cleanWhatsapp,
        messagesCount,
        mediaCount,
        contactsCount,
        riskLevel as 'low' | 'medium' | 'high'
      )
      
      console.log('✅ Resultado da análise:', result)
    } else {
      console.warn('❌ WhatsApp não encontrado em analysisData:', analysisData)
    }
    
    console.log('⬆️ Scrollando para o topo...')
    // Scroll para o topo antes de navegar
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Pequeno delay para o scroll completar
    setTimeout(() => {
      console.log('🚀 Navegando para /pagamento')
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
            <div className="flex items-center gap-4">
              {profilePictureUrl && (
                <div className="relative">
                  <img 
                    src={profilePictureUrl} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full border-2 border-red-500/50 object-cover"
                    onError={() => setProfilePictureUrl('')}
                  />
                  <div className="absolute -inset-1 bg-red-500/20 rounded-full animate-pulse"></div>
                </div>
              )}
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Analisando:</div>
                <div className="text-xl font-bold text-white">
                  {profileData?.name || 'Usuário'}
                </div>
                <div className="text-sm text-gray-400">{analysisData.whatsapp}</div>
                {profileData?.status?.status && (
                  <div className="text-xs text-gray-500 italic mt-1">"{profileData.status.status}"</div>
                )}
              </div>
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
                  {profilePictureUrl ? (
                    <>
                      <div className="w-32 h-32 rounded-full border-4 border-red-500/50 overflow-hidden bg-gray-800 shadow-2xl">
                        <img 
                          src={profilePictureUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          onError={() => setProfilePictureUrl('')}
                        />
                      </div>
                      <div className="absolute -inset-2 bg-red-500/20 rounded-full animate-ping"></div>
                      <div className="absolute -inset-1 border-2 border-red-500/30 rounded-full animate-pulse"></div>
                    </>
                  ) : (
                    <>
                      <div className="w-32 h-32 bg-red-500/20 rounded-full flex items-center justify-center border-4 border-red-500/50 animate-pulse">
                        <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-4xl">🔍</span>
                        </div>
                      </div>
                      <div className="absolute -inset-2 bg-red-500/20 rounded-full animate-ping"></div>
                    </>
                  )}
                </div>
              </div>
              
              <h2 className="text-3xl font-bold mb-4 title-premium">
                🔍 Analisando WhatsApp
              </h2>
              
              <p className="text-gray-300 text-lg">
                Verificando atividades suspeitas de <span className="text-red-400 font-bold">{profileData?.name || 'Usuário'}</span>
              </p>
              {profileData?.status?.status && (
                <p className="text-gray-400 text-sm italic mt-2">
                  Status: "{profileData.status.status}"
                </p>
              )}
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
                  className={`relative flex items-center p-3 md:p-6 rounded-2xl border-2 transition-all duration-500 ${
                    index === currentStep && isAnalyzing
                      ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/25'
                      : step.completed
                      ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/25'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className={`relative p-3 md:p-4 rounded-full mr-3 md:mr-6 ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : index === currentStep && isAnalyzing
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
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
                    <h3 className="font-bold text-lg md:text-xl text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-300 text-sm md:text-lg">
                      {step.description}
                    </p>
                  </div>

                  {step.completed && step.suspicious && (
                    <div className="text-right ml-2 md:ml-4 flex-shrink-0">
                      <div className="flex items-center text-red-400 font-bold text-lg md:text-xl mb-1 justify-end">
                        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 mr-1" />
                        {step.count}
                      </div>
                      <p className="text-red-300 text-xs md:text-sm font-semibold whitespace-nowrap">ENCONTRADOS</p>
                    </div>
                  )}

                  {step.completed && !step.suspicious && (
                    <div className="text-green-400 flex-shrink-0">
                      <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
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
              <div className="mt-8 glass-card p-4 md:p-8 warning-glow">
                <div className="text-center">
                  <div className="relative mb-4 md:mb-6">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/50">
                      <AlertTriangle className="w-10 h-10 md:w-16 md:h-16 text-red-400" />
                    </div>
                    <div className="absolute -inset-2 bg-red-500/20 rounded-full animate-ping"></div>
                  </div>
                  
                  <h3 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 title-premium neon-red leading-tight">
                    ⚠️ ATIVIDADE SUSPEITA DETECTADA!
                  </h3>
                  <p className="text-red-300 text-sm md:text-xl mb-6 md:mb-8 px-2">
                    Encontramos evidências que podem indicar comportamento suspeito.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-8">
                    <div className="bg-red-500/10 p-4 md:p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
                      <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">
                        {steps[1].count}
                      </div>
                      <div className="text-white font-semibold text-sm md:text-base">
                        Mensagens Suspeitas
                      </div>
                      <div className="text-red-300 text-xs md:text-sm mt-1">
                        Detectadas
                      </div>
                    </div>
                    <div className="bg-red-500/10 p-4 md:p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
                      <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">
                        {steps[2].count}
                      </div>
                      <div className="text-white font-semibold text-sm md:text-base">
                        Mídias Comprometedoras
                      </div>
                      <div className="text-red-300 text-xs md:text-sm mt-1">
                        Encontradas
                      </div>
                    </div>
                    <div className="bg-red-500/10 p-4 md:p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
                      <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">
                        {steps[3].count}
                      </div>
                      <div className="text-white font-semibold text-sm md:text-base">
                        Contatos Suspeitos
                      </div>
                      <div className="text-red-300 text-xs md:text-sm mt-1">
                        Identificados
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      console.log('🔘 Botão clicado!')
                      handleFinishAnalysis()
                    }}
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
