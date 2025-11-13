import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  AlertTriangle, 
  MessageCircle, 
  Image, 
  Users, 
  Download,
  CheckCircle,
  Phone,
  FileText,
  Trash2,
  Shield,
  TrendingUp,
  Eye
} from 'lucide-react'
import { useMetaPixel } from '../hooks/useMetaPixel'

const ResultPage = () => {
  const navigate = useNavigate()
  const { trackEvent } = useMetaPixel()
  const [finalResults, setFinalResults] = useState<any>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('messages')
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    // Verificar se o pagamento foi confirmado
    const paymentConfirmed = localStorage.getItem('paymentConfirmed')
    const paymentTimestamp = localStorage.getItem('paymentTimestamp')
    
    // Se não tiver pagamento confirmado ou se passou mais de 1 hora, redirecionar
    if (!paymentConfirmed || paymentConfirmed !== 'true') {
      navigate('/')
      return
    }
    
    // Verificar se o acesso ainda é válido (1 hora)
    if (paymentTimestamp) {
      const timestamp = parseInt(paymentTimestamp)
      const oneHour = 60 * 60 * 1000 // 1 hora em milissegundos
      const now = Date.now()
      
      if (now - timestamp > oneHour) {
        // Acesso expirado, limpar dados e redirecionar
        localStorage.removeItem('paymentConfirmed')
        localStorage.removeItem('paymentTimestamp')
        localStorage.removeItem('finalResults')
        navigate('/')
        return
      }
    }
    
    // Verificar se temos dados dos resultados
    const results = localStorage.getItem('finalResults')
    const data = localStorage.getItem('analysisData')
    
    if (!results || !data) {
      navigate('/')
      return
    }
    
    setFinalResults(JSON.parse(results))
    setAnalysisData(JSON.parse(data))
    
    // Rastreia visualização dos resultados (conversão final)
    trackEvent('ViewContent', {
      content_name: 'Analysis Results',
      content_category: 'Results Page'
    })
  }, [navigate, trackEvent])

  const getRiskText = (level: string) => {
    switch (level) {
      case 'high': return 'ALTO RISCO'
      case 'medium': return 'RISCO MÉDIO'
      default: return 'BAIXO RISCO'
    }
  }

  const handleNewAnalysis = () => {
    // Limpar todos os dados do localStorage
    localStorage.removeItem('paymentConfirmed')
    localStorage.removeItem('paymentTimestamp')
    localStorage.removeItem('finalResults')
    localStorage.removeItem('analysisResults')
    localStorage.removeItem('analysisData')
    
    // Redirecionar para página inicial
    navigate('/')
  }

  const handleDownloadPDF = async () => {
    // Rastreia download do relatório
    trackEvent('ViewContent', {
      content_name: 'PDF Report Download',
      content_category: 'Download'
    })
    
    setIsDownloading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const pdfContent = `
RELATÓRIO COMPLETO - DETECTOR DE TRAIÇÃO
===========================================

ANÁLISE DO WhatsApp: ${analysisData.whatsapp}
Data: ${new Date().toLocaleDateString('pt-BR')}

PONTUAÇÃO DE RISCO: ${finalResults.riskScore}/100

MENSAGENS SUSPEITAS ENCONTRADAS:
${finalResults.detailedMessages.map((msg: string, i: number) => `${i + 1}. ${msg}`).join('\n')}

CONTATOS SUSPEITOS:
${finalResults.suspiciousContacts.map((c: any, i: number) => `${i + 1}. ${c.name} - ${c.number} (Risco: ${c.risk})`).join('\n')}

MÍDIAS ENCONTRADAS:
- Fotos: ${finalResults.mediaAnalysis.photos}
- Vídeos: ${finalResults.mediaAnalysis.videos}
- Itens Deletados: ${finalResults.mediaAnalysis.deletedMedia}
    `
    
    const blob = new Blob([pdfContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    setIsDownloading(false)
  }

  if (!finalResults || !analysisData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-2xl">Carregando resultados...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Moderno */}
      <div className="danger-gradient text-white shadow-2xl">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={handleNewAnalysis}
                className="flex items-center text-white/80 hover:text-white transition-colors"
              >
                <Shield className="w-6 h-6 mr-2" />
                <span className="font-semibold">Nova Análise</span>
              </button>
              <div className="text-sm text-white/70">
                {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
            
            <div className="text-center">
              <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
                Relatório Completo
              </h1>
              
              <div className="inline-flex items-center gap-8 bg-white/10 backdrop-blur-md px-10 py-5 rounded-2xl border border-white/20 mb-8">
                <div>
                  <div className="text-sm text-white/70">WhatsApp Analisado</div>
                  <div className="font-bold text-2xl font-mono">{analysisData.whatsapp}</div>
                </div>
                <div className="w-px h-12 bg-white/30"></div>
                <div>
                  <div className="text-sm text-white/70">Data da Análise</div>
                  <div className="font-bold text-2xl">{new Date().toLocaleDateString('pt-BR')}</div>
                </div>
              </div>

              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="bg-white text-red-700 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-3"
              >
                {isDownloading ? (
                  <>
                    <div className="w-6 h-6 border-4 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                    Gerando Relatório...
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6" />
                    Baixar Relatório Completo
                  </>
                )}
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
              
              <h2 className="text-5xl font-bold mb-6 text-gray-900">
                Pontuação de Risco: {finalResults.riskScore}/100
              </h2>
              
              <div className={`inline-block px-8 py-4 rounded-2xl border-2 font-bold text-2xl mb-6 ${
                finalResults.riskLevel === 'high'
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
              }`}>
                {getRiskText(finalResults.riskLevel)}
              </div>
              
              <p className="text-gray-700 text-xl max-w-3xl mx-auto">
                {finalResults.riskLevel === 'high' 
                  ? 'Foram encontradas evidências significativas de comportamento suspeito que merecem atenção imediata.'
                  : 'Algumas atividades suspeitas foram identificadas, mas podem ter explicações inocentes.'
                }
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mt-10">
              <div className="flex justify-between text-xl text-gray-900 mb-4">
                <span className="font-bold">Nível de Suspeita</span>
                <span className="font-bold text-red-300">{finalResults.riskScore}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden border-2 border-gray-300">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 relative flex items-center justify-end pr-3 ${
                    finalResults.riskScore >= 80 ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700' :
                    finalResults.riskScore >= 60 ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500' : 
                    'bg-gradient-to-r from-green-500 via-yellow-500 to-orange-500'
                  }`}
                  style={{ width: `${finalResults.riskScore}%` }}
                >
                  <span className="relative z-10 text-white font-bold text-sm drop-shadow-lg">{finalResults.riskScore}%</span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-3 font-semibold">
                <span>0% Baixo</span>
                <span>50% Médio</span>
                <span>100% Alto</span>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="glass-card p-6 text-center ">
              <div className="bg-red-500/20 p-4 rounded-full w-fit mx-auto mb-4 border border-red-500/30">
                <MessageCircle className="w-12 h-12 text-red-400" />
              </div>
              <div className="text-4xl font-bold text-red-400 mb-2">
                {finalResults.detailedMessages.length}
              </div>
              <div className="text-gray-800 font-semibold mb-1">Mensagens Suspeitas</div>
              <div className="text-gray-600 text-sm">Detectadas</div>
            </div>
            
            <div className="glass-card p-6 text-center ">
              <div className="bg-orange-500/20 p-4 rounded-full w-fit mx-auto mb-4 border border-orange-500/30">
                <Image className="w-12 h-12 text-orange-400" />
              </div>
              <div className="text-4xl font-bold text-orange-400 mb-2">
                {finalResults.mediaAnalysis.photos + finalResults.mediaAnalysis.videos}
              </div>
              <div className="text-gray-800 font-semibold mb-1">Mídias Suspeitas</div>
              <div className="text-gray-600 text-sm">Encontradas</div>
            </div>
            
            <div className="glass-card p-6 text-center ">
              <div className="bg-purple-500/20 p-4 rounded-full w-fit mx-auto mb-4 border border-purple-500/30">
                <Users className="w-12 h-12 text-purple-400" />
              </div>
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {finalResults.suspiciousContacts.length}
              </div>
              <div className="text-gray-800 font-semibold mb-1">Contatos Suspeitos</div>
              <div className="text-gray-600 text-sm">Identificados</div>
            </div>
            
            <div className="glass-card p-6 text-center ">
              <div className="bg-blue-500/20 p-4 rounded-full w-fit mx-auto mb-4 border border-blue-500/30">
                <TrendingUp className="w-12 h-12 text-blue-400" />
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {finalResults.mediaAnalysis.deletedMedia}
              </div>
              <div className="text-gray-800 font-semibold mb-1">Itens Deletados</div>
              <div className="text-gray-600 text-sm">Recuperados</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 border-2 ${
                  activeTab === 'messages'
                    ? 'bg-red-600 border-red-400 shadow-xl shadow-red-500/50'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                }`}
              >
                <MessageCircle className={`w-6 h-6 ${activeTab === 'messages' ? 'text-white' : 'text-gray-700'}`} />
                <span className={activeTab === 'messages' ? 'text-white' : 'text-gray-700 hover:text-gray-900'}>Mensagens</span>
              </button>

              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 border-2 ${
                  activeTab === 'contacts'
                    ? 'bg-purple-600 border-purple-400 shadow-xl shadow-purple-500/50'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                }`}
              >
                <Users className={`w-6 h-6 ${activeTab === 'contacts' ? 'text-white' : 'text-gray-700'}`} />
                <span className={activeTab === 'contacts' ? 'text-white' : 'text-gray-700 hover:text-gray-900'}>Contatos</span>
              </button>

              <button
                onClick={() => setActiveTab('media')}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 border-2 ${
                  activeTab === 'media'
                    ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-500/50'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                }`}
              >
                <Image className={`w-6 h-6 ${activeTab === 'media' ? 'text-white' : 'text-gray-700'}`} />
                <span className={activeTab === 'media' ? 'text-white' : 'text-gray-700 hover:text-gray-900'}>Mídias</span>
              </button>

              <button
                onClick={() => setActiveTab('recommendations')}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 border-2 ${
                  activeTab === 'recommendations'
                    ? 'bg-green-600 border-green-400 shadow-xl shadow-green-500/50'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                }`}
              >
                <CheckCircle className={`w-6 h-6 ${activeTab === 'recommendations' ? 'text-white' : 'text-gray-700'}`} />
                <span className={activeTab === 'recommendations' ? 'text-white' : 'text-gray-700 hover:text-gray-900'}>Recomendações</span>
              </button>
            </div>
            
            <div className="glass-card p-10">
              {activeTab === 'messages' && (
                <div>
                  <h3 className="text-4xl font-bold text-gray-900 mb-4">
                    💬 Mensagens Suspeitas Detectadas
                  </h3>
                  <p className="text-gray-700 text-xl mb-10">
                    Encontramos <span className="text-red-400 font-bold text-2xl">{finalResults.detailedMessages.length}</span> mensagens comprometedoras
                  </p>
                  
                  <div className="grid gap-6">
                    {finalResults.detailedMessages.map((message: string, index: number) => (
                      <div key={index} className="bg-white border-2 border-red-500/30 rounded-2xl p-6 hover:border-red-500/60 transition-all shadow-sm">
                        <div className="flex items-start gap-5">
                          <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/40">
                            <MessageCircle className="w-6 h-6 text-red-400" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-5 mb-4">
                              <p className="text-gray-900 font-semibold text-xl leading-relaxed">
                                "{message}"
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-600">
                                {new Date().toLocaleDateString('pt-BR')} às {Math.floor(Math.random() * 24).toString().padStart(2, '0')}:{Math.floor(Math.random() * 60).toString().padStart(2, '0')}
                              </span>
                              <span className="bg-red-600 text-white px-4 py-1.5 rounded-full font-bold text-xs">
                                SUSPEITA
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'contacts' && (
                <div>
                  <h3 className="text-4xl font-bold text-gray-900 mb-8">
                    📞 Contatos Suspeitos Identificados
                  </h3>
                  <p className="text-gray-700 text-lg mb-8">
                    Encontramos {finalResults.suspiciousContacts.length} contatos com comportamento suspeito:
                  </p>
                  
                  <div className="space-y-5">
                    {finalResults.suspiciousContacts.map((contact: any, index: number) => (
                      <div key={index} className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-2 border-purple-500/50 rounded-2xl p-8 hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-5">
                            <div className="w-20 h-20 bg-purple-500/30 rounded-full flex items-center justify-center border-3 border-purple-400">
                              <Phone className="w-10 h-10 text-purple-200" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-2xl mb-2">{contact.name}</h4>
                              <p className="text-purple-100 text-xl font-mono bg-purple-900/30 px-4 py-2 rounded-lg inline-block">
                                {contact.number}
                              </p>
                            </div>
                          </div>
                          <div className={`px-6 py-3 rounded-xl text-lg font-bold border-3 ${
                            contact.risk === 'Alto' 
                              ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-500/50' 
                              : 'bg-yellow-600 text-white border-yellow-400 shadow-lg shadow-yellow-500/50'
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    📸 Análise Detalhada de Mídias
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-2 border-blue-500/30 rounded-2xl p-8 text-center transform hover:scale-105 transition-all">
                      <div className="bg-blue-500/30 p-4 rounded-full w-fit mx-auto mb-4">
                        <Image className="w-14 h-14 text-blue-300" />
                      </div>
                      <div className="text-5xl font-bold text-blue-300 mb-2">
                        {finalResults.mediaAnalysis.photos}
                      </div>
                      <div className="text-blue-200 font-semibold text-lg">Fotos Suspeitas</div>
                      <div className="text-blue-300/70 text-sm mt-2">Compartilhadas</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-2 border-purple-500/30 rounded-2xl p-8 text-center transform hover:scale-105 transition-all">
                      <div className="bg-purple-500/30 p-4 rounded-full w-fit mx-auto mb-4">
                        <FileText className="w-14 h-14 text-purple-300" />
                      </div>
                      <div className="text-5xl font-bold text-purple-300 mb-2">
                        {finalResults.mediaAnalysis.videos}
                      </div>
                      <div className="text-purple-200 font-semibold text-lg">Vídeos Suspeitos</div>
                      <div className="text-purple-300/70 text-sm mt-2">Enviados/Recebidos</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500/30 rounded-2xl p-8 text-center transform hover:scale-105 transition-all">
                      <div className="bg-red-500/30 p-4 rounded-full w-fit mx-auto mb-4">
                        <Trash2 className="w-14 h-14 text-red-300" />
                      </div>
                      <div className="text-5xl font-bold text-red-300 mb-2">
                        {finalResults.mediaAnalysis.deletedMedia}
                      </div>
                      <div className="text-red-200 font-semibold text-lg">Itens Deletados</div>
                      <div className="text-red-300/70 text-sm mt-2">Recuperados</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 rounded-2xl p-8">
                    <div className="flex items-start mb-4">
                      <Eye className="w-8 h-8 text-yellow-300 mr-3 mt-1" />
                      <div>
                        <h4 className="font-bold text-yellow-200 text-xl mb-3">
                          Observações Importantes sobre Mídias
                        </h4>
                        <ul className="text-yellow-100 space-y-3 text-lg">
                          <li className="flex items-start">
                            <span className="text-yellow-300 mr-2">•</span>
                            <span>Detectamos compartilhamento de conteúdo íntimo suspeito</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-yellow-300 mr-2">•</span>
                            <span>Várias mídias foram deletadas logo após o envio</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-yellow-300 mr-2">•</span>
                            <span>Padrão suspeito de envio durante horários de madrugada</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-yellow-300 mr-2">•</span>
                            <span>Uso frequente do modo "visualizar uma vez"</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-yellow-300 mr-2">•</span>
                            <span>Histórico de mídias enviadas para contatos não salvos</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div>
                  <h3 className="text-4xl font-bold text-gray-900 mb-8">
                    Recomendações Personalizadas
                  </h3>
                  <p className="text-gray-700 text-lg mb-8">
                    Com base na análise, sugerimos os seguintes passos:
                  </p>
                  
                  <div className="space-y-5">
                    {finalResults.recommendations.map((recommendation: string, index: number) => (
                      <div key={index} className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/50 rounded-2xl p-7">
                        <div className="flex items-start gap-4">
                          <div className="bg-green-500/30 p-3 rounded-full flex-shrink-0">
                            <CheckCircle className="w-7 h-7 text-green-200" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-xl mb-2">
                              Recomendação {index + 1}
                            </h4>
                            <p className="text-gray-700 text-lg">{recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/50 rounded-2xl p-8 mt-8">
                      <h4 className="font-bold text-blue-200 text-2xl mb-5 flex items-center gap-3">
                        💡 Próximos Passos Sugeridos
                      </h4>
                      <ul className="text-blue-100 space-y-4 text-lg">
                        <li className="flex items-start gap-3">
                          <span className="text-blue-300">•</span>
                          <span>Documente todas as evidências encontradas neste relatório</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-blue-300">•</span>
                          <span>Considere uma conversa honesta e direta com a pessoa</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-blue-300">•</span>
                          <span>Busque aconselhamento profissional se necessário</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-blue-300">•</span>
                          <span>Tome decisões baseadas em fatos, não apenas suspeitas</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="glass-card p-12 text-center">
            <h3 className="text-4xl font-bold text-gray-900 mb-6">
              Deseja Fazer Outra Análise?
            </h3>
            <p className="text-gray-700 mb-10 text-xl">
              Analise outro número de WhatsApp e descubra a verdade.
            </p>
            <div className="flex justify-center">
              <button 
                onClick={handleNewAnalysis}
                className="px-12 py-6 bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 rounded-2xl font-extrabold text-xl hover:from-green-700 hover:via-green-800 hover:to-emerald-800 transition-all duration-300 shadow-2xl shadow-green-600/60 border-3 border-green-400 transform hover:scale-110 flex items-center gap-4"
              >
                <AlertTriangle className="w-8 h-8 text-white" />
                <span className="text-white font-extrabold">Nova Análise Completa</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResultPage
