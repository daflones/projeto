// Tipos TypeScript para Meta Pixel (Facebook Pixel)

export interface FacebookPixel {
  (command: 'init', pixelId: string, options?: Record<string, unknown>): void;
  (command: 'track', event: StandardEvent, parameters?: EventParameters): void;
  (command: 'trackCustom', event: string, parameters?: EventParameters): void;
  (command: 'trackSingle', pixelId: string, event: string, parameters?: EventParameters): void;
  push: (...args: unknown[]) => void;
  loaded: boolean;
  version: string;
  queue: unknown[];
}

// Eventos padrão do Meta Pixel
export type StandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'Schedule'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe';

// Parâmetros dos eventos
export interface EventParameters {
  content_category?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    item_price?: number;
  }>;
  currency?: string;
  num_items?: number;
  predicted_ltv?: number;
  search_string?: string;
  status?: boolean;
  value?: number;
  // Parâmetros customizados
  [key: string]: unknown;
}

declare global {
  interface Window {
    fbq?: FacebookPixel;
    _fbq?: FacebookPixel;
  }
}

export {};
