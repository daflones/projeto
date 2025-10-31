import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll para o topo da página quando a rota mudar
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Scroll imediato sem animação
    })
  }, [pathname])

  return null
}

export default ScrollToTop
