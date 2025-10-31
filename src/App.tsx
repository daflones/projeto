import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AnalysisPage from './pages/AnalysisPage'
import PaymentPage from './pages/PaymentPage'
import ResultPage from './pages/ResultPage'
import ScrollToTop from './components/ScrollToTop'

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analise" element={<AnalysisPage />} />
          <Route path="/pagamento" element={<PaymentPage />} />
          <Route path="/resultado" element={<ResultPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
