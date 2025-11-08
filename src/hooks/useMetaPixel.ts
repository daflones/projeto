import { useEffect, useCallback } from 'react';
import type { StandardEvent, EventParameters } from '../types/meta-pixel';

/**
 * Hook para rastrear eventos do Meta Pixel
 * 
 * @example
 * ```tsx
 * const { trackEvent } = useMetaPixel();
 * 
 * // Rastrear lead quando usuário preenche formulário
 * trackEvent('Lead', { content_name: 'WhatsApp Form' });
 * 
 * // Rastrear compra
 * trackEvent('Purchase', { 
 *   value: 97.00, 
 *   currency: 'BRL',
 *   content_name: 'Plano Premium'
 * });
 * ```
 */
export const useMetaPixel = () => {
  /**
   * Rastreia um evento padrão do Meta Pixel
   */
  const trackEvent = useCallback((event: StandardEvent, parameters?: EventParameters) => {
    if (typeof window !== 'undefined' && window.fbq) {
      try {
        window.fbq('track', event, parameters);
        console.log(`[Meta Pixel] Event tracked: ${event}`, parameters);
      } catch (error) {
        console.error('[Meta Pixel] Error tracking event:', error);
      }
    } else {
      console.warn('[Meta Pixel] fbq not loaded yet');
    }
  }, []);

  /**
   * Rastreia um evento customizado
   */
  const trackCustomEvent = useCallback((eventName: string, parameters?: EventParameters) => {
    if (typeof window !== 'undefined' && window.fbq) {
      try {
        window.fbq('trackCustom', eventName, parameters);
        console.log(`[Meta Pixel] Custom event tracked: ${eventName}`, parameters);
      } catch (error) {
        console.error('[Meta Pixel] Error tracking custom event:', error);
      }
    } else {
      console.warn('[Meta Pixel] fbq not loaded yet');
    }
  }, []);

  /**
   * Rastreia visualização de página (PageView)
   * Útil para SPAs quando a rota muda
   */
  const trackPageView = useCallback(() => {
    trackEvent('PageView');
  }, [trackEvent]);

  return {
    trackEvent,
    trackCustomEvent,
    trackPageView,
  };
};

/**
 * Hook para rastrear PageView automaticamente quando a rota muda
 */
export const useMetaPixelPageView = () => {
  const { trackPageView } = useMetaPixel();

  useEffect(() => {
    trackPageView();
  }, [trackPageView]);
};
