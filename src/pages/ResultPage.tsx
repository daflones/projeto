import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  AlertTriangle, 
  MessageCircle, 
  Image, 
  Users, 
  Clock, 
  Download, 
  Share2,
  CheckCircle,
  XCircle,
  TrendingUp,
  Phone
} from 'lucide-react'

const ResultPage = () => {
  const navigate = useNavigate()
  const [finalResults, setFinalResults] = useState<any>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // Verificar se temos dados dos resultados
    const results = localStorage.getItem('finalResults')
    const data = localStorage.getItem('analysisData')
    
    if (!results || !data) {
      navigate('/')
      return
    }
    
    setFinalResults(JSON.parse(results))
    setAnalysisData(JSON.parse(data))
  }, [navigate])


  const getRiskText = (level: string) => {
    switch (level) {
      case 'high': return 'ALTO RISCO'
      case 'medium': return 'RISCO MÉDIO'
      default: return 'BAIXO RISCO'
    }
  }

  if (!finalResults || !analysisData) {
    return <div>Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Premium */}
      <div className="danger-gradient text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                <AlertTriangle className="w-16 h-16 text-yellow-300" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4 title-premium">
              📋 Relatório Completo de Análise
            </h1>
            
            <div className="glass-card p-6 mb-6 inline-block">
              <div className="flex items-center space-x-6 text-white">
                <div className="text-center">
                  <div className="text-sm opacity-80">Analisado:</div>
                  <div className="font-bold text-lg">{analysisData.targetName}</div>
                </div>
                <div className="w-px h-8 bg-white/30"></div>
                <div className="text-center">
                  <div className="text-sm opacity-80">WhatsApp:</div>
                  <div className="font-bold text-lg">{analysisData.whatsapp}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm border border-white/30 flex items-center">
                <Download className="w-5 h-5 mr-2" />
                Baixar PDF Premium
              </button>
              <button className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm border border-white/30 flex items-center">
                <Share2 className="w-5 h-5 mr-2" />
                Compartilhar Resultado
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Risk Score Card */}
          <div className="glass-card p-8 mb-8 warning-glow">
            <div className="text-center">
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  <div className={`p-8 rounded-full border-4 ${
                    finalResults.riskLevel === 'high' 
                      ? 'bg-red-500/20 border-red-500/50' 
                      : 'bg-yellow-500/20 border-yellow-500/50'
                  }`}>
                    <AlertTriangle className="w-20 h-20 text-red-400" />
                  </div>
                  <div className="absolute -inset-2 bg-red-500/20 rounded-full animate-ping"></div>
                </div>
              </div>
              
              <h2 className="text-5xl font-bold mb-6 title-premium">
                Pontuação de Risco: {finalResults.riskScore}/100
              </h2>
              
              <div className={`inline-block px-8 py-4 rounded-2xl border-2 font-bold text-2xl mb-6 ${
                finalResults.riskLevel === 'high'
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
              }`}>
                {getRiskText(finalResults.riskLevel)}
              </div>
              
              <p className="text-gray-300 text-xl max-w-3xl mx-auto">
                {finalResults.riskLevel === 'high' 
                  ? '🚨 Foram encontradas evidências significativas de comportamento suspeito que merecem atenção imediata.'
                  : '⚠️ Algumas atividades suspeitas foram identificadas, mas podem ter explicações inocentes.'
                }
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mt-10">
              <div className="flex justify-between text-lg text-gray-300 mb-4">
                <span className="font-semibold">Nível de Suspeita</span>
                <span className="font-bold text-red-400">{finalResults.riskScore}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-6 overflow-hidden">
                <div 
                  className={`h-6 rounded-full transition-all duration-2000 relative ${
                    finalResults.riskScore >= 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    finalResults.riskScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                    'bg-gradient-to-r from-green-500 to-green-600'
                  }`}
                  style={{ width: `${finalResults.riskScore}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>Baixo</span>
                <span>Médio</span>
                <span>Alto</span>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="glass-card p-6 text-center floating-element">
              <div className="bg-red-500/20 p-4 rounded-full w-fit mx-auto mb-4 border border-red-500/30">
                <MessageCircle className="w-12 h-12 text-red-400" />
              </div>
              <div className="text-4xl font-bold text-red-400 mb-2">
                {finalResults.messages}
              </div>
              <div className="text-white font-semibold mb-1">Mensagens Suspeitas</div>
              <div className="text-gray-400 text-sm">Detectadas</div>
            </div>
            
            <div className="glass-card p-6 text-center floating-element">
              <div className="bg-orange-500/20 p-4 rounded-full w-fit mx-auto mb-4 border border-orange-500/30">
                <Image className="w-12 h-12 text-orange-400" />
              </div>
              <div className="text-4xl font-bold text-orange-400 mb-2">
                {finalResults.mediaAnalysis.photos + finalResults.mediaAnalysis.videos}
              </div>
              <div className="text-white font-semibold mb-1">Mídias Comprometedoras</div>
              <div className="text-gray-400 text-sm">Encontradas</div>
            </div>
            
            <div className="glass-card p-6 text-center floating-element">
              <div className="bg-purple-500/20 p-4 rounded-full w-fit mx-auto mb-4 border border-purple-500/30">
                <Users className="w-12 h-12 text-purple-400" />
              </div>
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {finalResults.contacts}
              </div>
              <div className="text-white font-semibold mb-1">Contatos Suspeitos</div>
              <div className="text-gray-400 text-sm">Identificados</div>
            </div>
            
            <div className="glass-card p-6 text-center floating-element">
              <div className="bg-blue-500/20 p-4 rounded-full w-fit mx-auto mb-4 border border-blue-500/30">
                <TrendingUp className="w-12 h-12 text-blue-400" />
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {finalResults.mediaAnalysis.deletedMedia}
              </div>
              <div className="text-white font-semibold mb-1">Itens Deletados</div>
              <div className="text-gray-400 text-sm">Recuperados</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="glass-card overflow-hidden mb-8">
            <div className="border-b border-white/10">
              <nav className="flex bg-white/5 p-2 rounded-t-2xl">
                {[
                  { id: 'overview', label: 'Visão Geral', icon: AlertTriangle },
                  { id: 'messages', label: 'Mensagens', icon: MessageCircle },
                  { id: 'contacts', label: 'Contatos', icon: Users },
                  { id: 'media', label: 'Mídias', icon: Image },
                  { id: 'recommendations', label: 'Recomendações', icon: CheckCircle }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-red-500 text-white shadow-lg transform scale-105'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-8">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    Resumo da Análise
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                      <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                        <XCircle className="w-5 h-5 mr-2" />
                        Sinais de Alerta Encontrados
                      </h4>
                      <ul className="space-y-2 text-red-700">
                        <li>• Conversas deletadas frequentemente</li>
                        <li>• Atividade suspeita em horários específicos</li>
                        <li>• Contatos salvos com nomes falsos</li>
                        <li>• Troca de mídias íntimas</li>
                        <li>• Padrões de comportamento evasivo</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        Padrões de Horário
                      </h4>
                      <div className="space-y-2 text-blue-700">
                        <div>Maior atividade: 22h - 02h</div>
                        <div>Conversas suspeitas: Madrugada</div>
                        <div>Deletadas frequentemente: Manhã</div>
                        <div>Pico de atividade: Fins de semana</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'messages' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">
                    Análise de Mensagens Suspeitas
                  </h3>
                  
                  <div className="space-y-4">
                    {finalResults.detailedMessages.map((message: string, index: number) => (
                      <div key={index} className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                        <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-red-800 font-medium">{message}</p>
                            <p className="text-red-600 text-sm mt-1">
                              Detectado em: {new Date().toLocaleDateString('pt-BR')} às {Math.floor(Math.random() * 24)}:{Math.floor(Math.random() * 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'contacts' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">
                    Contatos Suspeitos Identificados
                  </h3>
                  
                  <div className="space-y-4">
                    {finalResults.suspiciousContacts.map((contact: any, index: number) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                              <Phone className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800">{contact.name}</h4>
                              <p className="text-gray-600">{contact.number}</p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            contact.risk === 'Alto' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            Risco {contact.risk}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">
                    Análise de Mídias
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                      <Image className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {finalResults.mediaAnalysis.photos}
                      </div>
                      <div className="text-gray-600">Fotos Suspeitas</div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                      <Image className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {finalResults.mediaAnalysis.videos}
                      </div>
                      <div className="text-gray-600">Vídeos Suspeitos</div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        {finalResults.mediaAnalysis.deletedMedia}
                      </div>
                      <div className="text-gray-600">Mídias Deletadas</div>
                    </div>
                  </div>

                  <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <h4 className="font-semibold text-yellow-800 mb-3">
                      ⚠️ Observações Importantes sobre Mídias
                    </h4>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• Detectamos compartilhamento de conteúdo íntimo</li>
                      <li>• Várias mídias foram deletadas após o envio</li>
                      <li>• Padrão suspeito de envio durante madrugada</li>
                      <li>• Uso frequente de modo "visualizar uma vez"</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">
                    Recomendações Personalizadas
                  </h3>
                  
                  <div className="space-y-6">
                    {finalResults.recommendations.map((recommendation: string, index: number) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-start">
                          <CheckCircle className="w-6 h-6 text-blue-500 mr-3 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-blue-800 mb-2">
                              Recomendação {index + 1}
                            </h4>
                            <p className="text-blue-700">{recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                      <h4 className="font-semibold text-green-800 mb-3">
                        💡 Próximos Passos Sugeridos
                      </h4>
                      <ul className="text-green-700 space-y-2">
                        <li>• Documente as evidências encontradas</li>
                        <li>• Considere uma conversa honesta e direta</li>
                        <li>• Busque aconselhamento profissional se necessário</li>
                        <li>• Tome decisões baseadas em fatos, não apenas suspeitas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Precisa de Mais Ajuda?
            </h3>
            <p className="text-gray-600 mb-6">
              Nossa equipe de especialistas está disponível para te ajudar a interpretar os resultados.
            </p>
            <div className="flex justify-center space-x-4">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Falar com Especialista
              </button>
              <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Nova Análise
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResultPage
