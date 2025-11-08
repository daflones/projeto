import { useCallback, useEffect } from 'react'
import { trackAnalyticsEvent, trackFunnelStep } from '../services/adminService'

// Gera ou recupera um ID de sessão único
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('session_id')
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('session_id', sessionId)
  }
  
  return sessionId
}

/**
 * Hook para rastrear eventos de analytics no banco de dados
 */
export function useAnalytics() {
  const sessionId = getSessionId()

  /**
   * Rastreia um evento de analytics
   */
  const trackEvent = useCallback(async (
    eventType: string,
    eventName?: string,
    pagePath?: string,
    whatsapp?: string,
    eventData?: Record<string, any>
  ) => {
    try {
      await trackAnalyticsEvent(
        eventType,
        eventName,
        pagePath || window.location.pathname,
        whatsapp,
        sessionId,
        eventData
      )
    } catch (error) {
      console.error('Erro ao rastrear evento:', error)
    }
  }, [sessionId])

  /**
   * Rastreia visualização de página
   */
  const trackPageView = useCallback(async (pagePath?: string) => {
    await trackEvent('page_view', 'Page View', pagePath || window.location.pathname)
  }, [trackEvent])

  /**
   * Rastreia um passo do funil
   */
  const trackFunnel = useCallback(async (
    stepName: string,
    stepOrder: number,
    whatsapp?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      await trackFunnelStep(
        whatsapp || '',
        sessionId,
        stepName,
        stepOrder,
        metadata
      )
    } catch (error) {
      console.error('Erro ao rastrear funil:', error)
    }
  }, [sessionId])

  return {
    trackEvent,
    trackPageView,
    trackFunnel,
    sessionId
  }
}

/**
 * Hook para rastrear PageView automaticamente
 */
export function usePageViewTracking() {
  const { trackPageView } = useAnalytics()

  useEffect(() => {
    trackPageView()
  }, [trackPageView])
}
