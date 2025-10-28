import { MessageCircle, Image, Mic, Video, Phone } from 'lucide-react'
import { useMemo } from 'react'

const FakeMessages = () => {
  // Função para gerar nomes aleatórios (usando useMemo para não regenerar)
  const messages = useMemo(() => {
    const names = [
      "Ana", "Bruno Trabalho", "Camila Academia", "Diego", "Fernanda",
      "Gabriel Personal", "Ju", "Lucas Vizinho", "Mariana", "Pedro",
      "Renata", "Thiago Uber", "Vanessa", "André", "Bianca",
      "Carlos Delivery", "Daniela", "Eduardo", "Fabiana", "Gustavo",
      "Helena", "Igor", "Jéssica", "Karina", "Leonardo",
      "Mônica", "Natália", "Otávio", "Patrícia", "Rafael",
      "Sabrina", "Tiago", "Úrsula", "Vinícius", "Wesley",
      "Ximena", "Yara", "Zeca", "Amanda", "Bernardo",
      "Contato não salvo", "+55 11 9****-****", "Número desconhecido",
      "Colega", "Amigo(a)", "Vizinho", "Professor", "Instrutor"
    ]
    
    const textMessages = [
      "Oi, tudo bem? Tô com saudades...",
      "Consegue sair hoje?",
      "Deleta depois, ok?",
      "Não fala nada pra ninguém",
      "Tô pensando em você",
      "Que tal nos encontrarmos?",
      "Adorei ontem ❤️",
      "Você tá livre?",
      "Preciso te ver",
      "Tá complicado aqui em casa...",
      "Você é especial pra mim",
      "Quando vai dar certo?",
      "Nosso segredo",
      "Mal posso esperar",
      "Oi lindeza, como foi o dia?",
      "Conseguiu sair de casa?",
      "Tô morrendo de saudade",
      "Vamos marcar algo?",
      "Não posso parar de pensar em você",
      "Ela/ele não desconfia de nada",
      "Te amo demais",
      "Quando a gente vai ficar junto?",
      "Apaga tudo depois",
      "Só você me entende",
      "Tô louca/o pra te ver",
      "Hoje não vai dar...",
      "Inventei uma desculpa aqui",
      "Você é incrível"
    ]

    const mediaContents = [
      "📷 Foto", "🎥 Vídeo (0:30)", "🎵 Áudio (0:15)", 
      "📷 Selfie", "🎥 Vídeo (1:45)", "🎵 Mensagem de voz (0:08)",
      "📷 Imagem", "🎥 Chamada perdida", "🎵 Áudio (0:22)",
      "📷 Foto enviada", "🎥 Vídeo (0:12)", "🎵 Nota de voz (0:35)",
      "📷 2 fotos", "🎥 Vídeo curto", "🎵 Áudio (1:02)",
      "📷 Imagem deletada", "🎥 Vídeo (2:15)", "🎵 Mensagem (0:18)"
    ]

    // Gerar horários aleatórios (principalmente noturnos e suspeitos)
    const generateTime = () => {
      const suspiciousTimes = [
        "23:45", "00:12", "01:30", "02:15", "22:30", "23:15", "00:45", "01:20",
        "14:22", "15:30", "16:45", "19:08", "20:30", "21:15", "13:45", "17:20"
      ]
      return suspiciousTimes[Math.floor(Math.random() * suspiciousTimes.length)]
    }

    const generatedMessages = []
    for (let i = 0; i < 8; i++) {
      const isMedia = Math.random() > 0.6
      const name = names[Math.floor(Math.random() * names.length)]
      
      let content, type
      if (isMedia) {
        content = mediaContents[Math.floor(Math.random() * mediaContents.length)]
        type = content.includes('📷') ? 'image' : content.includes('🎥') ? 'video' : 'audio'
      } else {
        const fullText = textMessages[Math.floor(Math.random() * textMessages.length)]
        // Mostrar apenas parte da mensagem com blur no final
        const visiblePart = fullText.substring(0, Math.floor(fullText.length * 0.4))
        content = `${visiblePart}...`
        type = 'text'
      }

      generatedMessages.push({
        id: i + 1,
        sender: name,
        time: generateTime(),
        type,
        content,
        fullContent: isMedia ? content : textMessages[Math.floor(Math.random() * textMessages.length)],
        isBlurred: true
      })
    }
    
    return generatedMessages.sort((a: any, b: any) => b.time.localeCompare(a.time))
  }, []) // Array vazio garante que só execute uma vez

  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />
      case 'audio': return <Mic className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'call': return <Phone className="w-4 h-4" />
      default: return <MessageCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="glass-card p-6 border border-orange-500/30">
      <div className="flex items-center mb-6">
        <div className="w-3 h-3 bg-orange-400 rounded-full mr-3 animate-pulse"></div>
        <h4 className="font-semibold text-orange-300 text-lg">📱 Conversas Suspeitas Detectadas</h4>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-hidden">
        {messages.map((message: any) => (
          <div 
            key={message.id}
            className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 hover:border-orange-500/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center border border-orange-500/30">
                  {getIcon(message.type)}
                </div>
                <span className="font-medium text-white text-sm">{message.sender}</span>
              </div>
              <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full">{message.time}</span>
            </div>
            
            <div className="text-gray-300 text-sm relative">
              <span className="inline">{message.content}</span>
              {message.type === 'text' && (
                <span className="inline-block ml-2 bg-gradient-to-r from-transparent via-gray-600 to-gray-800 text-transparent bg-clip-text blur-sm">
                  texto borrado aqui
                </span>
              )}
            </div>
            
            <div className="absolute bottom-2 right-2">
              <div className="bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded-full font-medium border border-orange-500/30">
                SUSPEITO
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-center bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
        <p className="text-orange-300 text-sm font-semibold mb-1">
          ⚠️ {messages.length} conversas suspeitas encontradas
        </p>
        <p className="text-gray-400 text-xs">
          Desbloqueie o relatório completo para ver todo o conteúdo
        </p>
      </div>
    </div>
  )
}

export default FakeMessages
