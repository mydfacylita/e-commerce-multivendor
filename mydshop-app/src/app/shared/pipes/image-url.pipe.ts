import { Pipe, PipeTransform } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

/**
 * Pipe to transform image URLs for proper loading in WebView/Capacitor and Browser
 * 
 * Usage: {{ product.images?.[0] | imageUrl }}
 * 
 * This pipe:
 * - Converts local /uploads/* paths to full URLs with proper host
 * - Keeps external URLs (http/https) unchanged
 * - Returns fallback for empty/null values
 */
@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {
  
  private baseUrl: string;
  
  constructor() {
    // ALWAYS use full URL for local images (works in browser, webview, and capacitor)
    const mobileEnv = (environment as any).MOBILE_ENV || 'production';
    
    if (mobileEnv === 'local') {
      // Check if we're in Capacitor (Android/iOS) - use IP address
      if (Capacitor.isNativePlatform() || this.isWebViewAndroid()) {
        this.baseUrl = 'http://192.168.3.20:3000';
      } else {
        // Browser development - use localhost
        this.baseUrl = 'http://localhost:3000';
      }
    } else {
      // Production
      this.baseUrl = 'https://mfrural.shop';
    }
    
    console.log('[ImageUrlPipe] Initialized with baseUrl:', this.baseUrl, 'env:', mobileEnv);
  }
  
  transform(url: string | null | undefined, fallback: string = 'assets/placeholder.png'): string {
    // Return fallback for empty values
    if (!url || url.trim() === '') {
      return fallback;
    }
    
    // If already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a local path (starts with /uploads or similar)
    if (url.startsWith('/')) {
      const fullUrl = `${this.baseUrl}${url}`;
      console.log('[ImageUrlPipe] Transformed:', url, '->', fullUrl);
      return fullUrl;
    }
    
    // Return as-is if it doesn't match any pattern
    return url;
  }
  
  /**
   * Check if running in Android WebView
   */
  private isWebViewAndroid(): boolean {
    if (typeof window === 'undefined' || !window.navigator) {
      return false;
    }
    const ua = window.navigator.userAgent.toLowerCase();
    return ua.includes('android') && (ua.includes('wv') || ua.includes('webview'));
  }
}
