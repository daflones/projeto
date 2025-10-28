# 🚨 Detector de Traição - Projeto de Marketing Digital

Uma aplicação React + Vite para captura de leads através de uma simulação de análise de WhatsApp.

## 🚀 Tecnologias Utilizadas

- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **Lucide React** para ícones
- **Framer Motion** para animações

## 📦 Instalação

```bash
# Clone o repositório
git clone <seu-repositorio>

# Entre na pasta
cd detector-traicao

# Instale as dependências
npm install

# Execute em desenvolvimento
npm run dev
```

## 🌐 Deploy no EasyPanel

### 1. Preparação do Projeto

O projeto já está configurado para deploy com:
- Vite configurado para aceitar conexões externas (`host: '0.0.0.0'`)
- Build otimizado para produção
- Todas as dependências necessárias

### 2. Comandos de Build

```bash
# Build para produção
npm run build

# Preview da build
npm run preview
```

### 3. Configuração no EasyPanel

1. **Criar novo projeto:**
   - Tipo: Static Site
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **Variáveis de ambiente (se necessário):**
   ```
   NODE_ENV=production
   ```

3. **Configurações de rede:**
   - Port: 4173 (para preview) ou automático
   - Host: 0.0.0.0

### 4. Deploy via GitHub

1. Suba o código para o GitHub
2. Conecte o repositório no EasyPanel
3. Configure o auto-deploy no push para main/master

## 📱 Funcionalidades

### Fluxo da Aplicação

1. **Landing Page (`/`):**
   - Formulário de captura (WhatsApp + Nome)
   - Design chamativo com urgência
   - Depoimentos sociais

2. **Página de Análise (`/analise`):**
   - Simulação de análise em tempo real
   - Progress bar animado
   - Resultados falsos gerados aleatoriamente

3. **Página de Pagamento (`/pagamento`):**
   - Planos de assinatura
   - Timer de urgência
   - Preview dos resultados

4. **Página de Resultados (`/resultado`):**
   - Relatório completo simulado
   - Dados aleatórios convincentes
   - Interface profissional

## 🎯 Estratégia de Marketing

Consulte o arquivo `ROTEIRO_MARKETING.md` para:
- Estratégia completa para Instagram
- Criativos para anúncios pagos
- Funil de conversão
- Métricas para acompanhar

## ⚖️ Considerações Legais

**IMPORTANTE:** Este projeto é apenas para fins educacionais e demonstração de conceitos de marketing digital.

- Adicione disclaimers apropriados
- Implemente termos de uso
- Considere aspectos éticos
- Use apenas para aprendizado

## 🔧 Customização

### Cores e Branding
Edite `tailwind.config.js` e `src/index.css` para personalizar:
- Paleta de cores
- Fontes
- Animações

### Conteúdo
Modifique os textos em:
- `src/pages/LandingPage.tsx`
- `src/pages/AnalysisPage.tsx`
- `src/pages/PaymentPage.tsx`
- `src/pages/ResultPage.tsx`

### Lógica de Negócio
Para implementar funcionalidades reais:
- Integre com APIs de pagamento
- Adicione backend para processamento
- Implemente analytics
- Configure email marketing

## 📊 Analytics Recomendados

- Google Analytics 4
- Facebook Pixel
- Hotjar para heatmaps
- Google Tag Manager

## 🚀 Otimizações para Produção

- [x] Configuração do Vite otimizada
- [x] Tailwind CSS com purge
- [x] Componentes otimizados
- [x] Lazy loading de rotas
- [ ] Service Worker (PWA)
- [ ] Compressão de imagens
- [ ] CDN para assets

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Lint do código
npm run lint
```

## 📞 Suporte

Para dúvidas sobre o projeto:
1. Consulte a documentação do Vite
2. Verifique os logs do EasyPanel
3. Teste localmente antes do deploy

---

**Desenvolvido para fins educacionais - Use com responsabilidade! 🎓**
