import { useEffect } from 'react';

interface MetaPixelProps {
  pixelId: string;
}

/**
 * Componente Meta Pixel (Facebook Pixel)
 * 
 * Instala o código base do Meta Pixel no site.
 * 
 * @param pixelId - ID do pixel obtido no Meta Events Manager
 * 
 * Como obter o Pixel ID:
 * 1. Acesse: https://business.facebook.com/events_manager/
 * 2. Clique em "Conectar Fontes de Dados" → "Web" → "Meta Pixel"
 * 3. Nomeie seu pixel e copie o ID (ex: 123456789012345)
 */
const MetaPixel = ({ pixelId }: MetaPixelProps) => {
  useEffect(() => {
    // Verifica se o pixel já foi carregado
    if (window.fbq) {
      return;
    }

    // Código base do Meta Pixel
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Adiciona noscript para navegadores sem JavaScript
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `
      <img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />
    `;
    document.body.appendChild(noscript);

    // Cleanup
    return () => {
      // Não removemos o script pois o pixel deve persistir
    };
  }, [pixelId]);

  return null;
};

export default MetaPixel;
