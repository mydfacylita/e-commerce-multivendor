/**
 * 🔧 CONFIGURAÇÃO CENTRALIZADA DE API
 * 
 * Altere apenas as constantes abaixo para mudar entre ambientes.
 * Não precisa mexer em mais nada.
 */

// ═══════════════════════════════════════════════════════════════
// 📌 CONFIGURAÇÃO PRINCIPAL - ALTERE AQUI
// ═══════════════════════════════════════════════════════════════

/** 
 * Ambiente para dispositivos móveis (Capacitor): 'local' | 'production' 
 * - 'local': Usa o IP local (para desenvolvimento)
 * - 'production': Usa mydshop.com.br
 */
export const MOBILE_ENV: 'local' | 'production' = 'production';

/** IP da máquina de desenvolvimento (para testes locais) */
export const LOCAL_IP = '192.168.15.10';

/** Porta do Next.js local */
export const LOCAL_PORT = 3000;

// ═══════════════════════════════════════════════════════════════
// 🔒 URLs CALCULADAS AUTOMATICAMENTE - NÃO ALTERE
// ═══════════════════════════════════════════════════════════════

/**
 * Detecta se está rodando em um WebView Android (app nativo)
 */
function isAndroidWebView(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  // WebView Android tem 'wv' no user agent OU tem 'android' + 'version/'
  return ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
}

/**
 * Detecta se está rodando no Capacitor (app nativo)
 */
function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Primeiro verificar se é WebView Android
  if (isAndroidWebView()) return true;
  
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  
  // Verificar isNativePlatform
  if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
  
  // Verificar platform
  if (cap.getPlatform && (cap.getPlatform() === 'android' || cap.getPlatform() === 'ios')) return true;
  
  return false;
}

/**
 * Detecta se está rodando no browser localhost (NÃO Capacitor/WebView)
 */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  if (isCapacitor()) return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Detecta se está rodando via ionic serve (porta 8100) no BROWSER
 */
function isIonicServe(): boolean {
  if (typeof window === 'undefined') return false;
  if (isCapacitor()) return false;
  return window.location.port === '8100';
}

/**
 * Retorna a URL da API baseado no ambiente
 * - Browser localhost: usa proxy '/api' 
 * - Browser via IP: usa IP:porta direto
 * - Capacitor/Mobile: usa MOBILE_ENV
 */
export function getApiUrl(): string {
  // Capacitor (app nativo) - SEMPRE usar URL completa
  if (isCapacitor()) {
    if (MOBILE_ENV === 'local') {
      const url = `http://${LOCAL_IP}:${LOCAL_PORT}/api`;
      console.log('📱 Capacitor - Usando IP local:', url);
      return url;
    }
    const url = 'https://www.mydshop.com.br/api';
    console.log('📱 Capacitor - Usando produção:', url);
    return url;
  }
  
  // Browser localhost - usar proxy (evita CORS)
  if (isLocalhost()) {
    console.log('🌐 Browser localhost - usando proxy /api');
    return '/api';
  }
  
  // Capacitor ou browser via IP
  if (MOBILE_ENV === 'local') {
    const url = `http://${LOCAL_IP}:${LOCAL_PORT}/api`;
    console.log('📱 Usando IP local:', url);
    return url;
  }
  
  // Produção
  const url = 'https://www.mydshop.com.br/api';
  console.log('🌐 Usando produção:', url);
  return url;
}

/**
 * Retorna a URL base para imagens e assets baseado no ambiente
 * IMPORTANTE: Sempre retorna URL completa para que imagens funcionem
 */
export function getBaseUrl(): string {
  // Verificar se é WebView Android DIRETAMENTE (mais confiável)
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
    
    if (isWebView && MOBILE_ENV === 'local') {
      console.log('📱 getBaseUrl: WebView Android ->', `http://${LOCAL_IP}:${LOCAL_PORT}`);
      return `http://${LOCAL_IP}:${LOCAL_PORT}`;
    }
  }
  
  // Se é Capacitor detectado por outras formas
  if (isCapacitor() && MOBILE_ENV === 'local') {
    console.log('📱 getBaseUrl: Capacitor ->', `http://${LOCAL_IP}:${LOCAL_PORT}`);
    return `http://${LOCAL_IP}:${LOCAL_PORT}`;
  }
  
  // Produção no app
  if (isCapacitor()) {
    return 'https://www.mydshop.com.br';
  }
  
  // Browser - ionic serve ou localhost
  if (MOBILE_ENV === 'local') {
    console.log('🌐 getBaseUrl: Browser ->', `http://localhost:${LOCAL_PORT}`);
    return `http://localhost:${LOCAL_PORT}`;
  }
  
  // Produção
  return 'https://www.mydshop.com.br';
}

/**
 * Retorna se está em ambiente local
 */
export function isLocalEnv(): boolean {
  return MOBILE_ENV === 'local' || isLocalhost();
}

/**
 * Log de diagnóstico
 */
export function logApiConfig(): void {
  console.log('═══════════════════════════════════════════');
  console.log('🔧 API CONFIG');
  console.log('═══════════════════════════════════════════');
  console.log(`📍 Mobile Env: ${MOBILE_ENV.toUpperCase()}`);
  console.log(`📱 Is Capacitor: ${isCapacitor()}`);
  console.log(`🏠 Is Localhost: ${isLocalhost()}`);
  console.log(`🌐 API URL: ${getApiUrl()}`);
  console.log('═══════════════════════════════════════════');
}

/**
 * Verifica se é WebView Android (usado para decisões de URL)
 */
function isWebViewAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
}

/**
 * Converte URL de imagem relativa para URL absoluta
 * Necessário para imagens locais funcionarem no Capacitor
 * 
 * Para resolver problema de CORS no Android WebView:
 * - Usa /api/image/ para servir imagens locais com CORS headers
 * 
 * @param imageUrl - URL da imagem (pode ser relativa ou absoluta)
 * @returns URL absoluta da imagem
 */
export function getImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return 'assets/placeholder.png';
  }
  
  // Se já é URL absoluta com http/https
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // 🔒 IMPORTANTE: Converter http:// para https:// em produção
    // Evita erro de mixed content no Android WebView
    if (MOBILE_ENV === 'production' && imageUrl.startsWith('http://www.mydshop.com.br')) {
      return imageUrl.replace('http://', 'https://');
    }
    if (MOBILE_ENV === 'production' && imageUrl.startsWith('http://mydshop.com.br')) {
      return imageUrl.replace('http://', 'https://');
    }
    return imageUrl;
  }
  
  // Se começa com data: (base64), retornar como está
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // Se começa com assets/, retornar como está (arquivo local do app)
  if (imageUrl.startsWith('assets/')) {
    return imageUrl;
  }
  
  // URL relativa - converter para absoluta usando API route de imagem
  const baseUrl = getBaseUrl();
  
  // Garantir que a URL começa com /
  let cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  // Para WebView Android, usar API route que tem CORS headers corretos
  // Converte /uploads/xxx para /api/image/uploads/xxx
  if ((isWebViewAndroid() || isCapacitor()) && MOBILE_ENV === 'local') {
    // Remover a barra inicial para a API route
    const pathWithoutLeadingSlash = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
    cleanUrl = `/api/image/${pathWithoutLeadingSlash}`;
  }
  
  const fullUrl = `${baseUrl}${cleanUrl}`;
  
  // Log apenas para as primeiras conversões (evitar spam)
  if (!(window as any).__imageLogCount) (window as any).__imageLogCount = 0;
  if ((window as any).__imageLogCount < 5) {
    console.log('🖼️ getImageUrl:', imageUrl, '->', fullUrl);
    (window as any).__imageLogCount++;
  }
  
  return fullUrl;
}

/**
 * Converte array de URLs de imagens
 */
export function getImageUrls(images: string[] | null | undefined): string[] {
  if (!images || images.length === 0) {
    return ['assets/placeholder.png'];
  }
  return images.map(img => getImageUrl(img));
}
