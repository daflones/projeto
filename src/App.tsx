import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AnalysisPage from './pages/AnalysisPage'
import ResultPage from './pages/ResultPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ScrollToTop from './components/ScrollToTop'
import MetaPixel from './components/MetaPixel'
import { AdminProvider } from './contexts/AdminContext'

function App() {
  // Obtém o Pixel ID das variáveis de ambiente
  const metaPixelId = import.meta.env.VITE_META_PIXEL_ID

  return (
    <AdminProvider>
      <Router>
        {/* Meta Pixel - Rastreamento de conversões do Facebook/Instagram Ads */}
        {metaPixelId && <MetaPixel pixelId={metaPixelId} />}
        
        <ScrollToTop />
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/analise" element={<AnalysisPage />} />
            <Route path="/resultado" element={<ResultPage />} />
            
            {/* Rotas Admin */}
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/admin-page" element={<AdminDashboardPage />} />
          </Routes>
        </div>
      </Router>
    </AdminProvider>
  )
}

export default App
