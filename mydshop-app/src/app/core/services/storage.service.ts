/**
 * 💾 STORAGE SERVICE
 * 
 * Serviço para armazenamento local persistente.
 * Usa Capacitor Preferences para acesso nativo em dispositivos.
 */

import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor() {}

  /**
   * Salva um valor no storage
   */
  async set(key: string, value: any): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await Preferences.set({ key, value: stringValue });
  }

  /**
   * Recupera um valor do storage
   */
  async get<T = string>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key });
    
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * Remove um valor do storage
   */
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  /**
   * Limpa todo o storage
   */
  async clear(): Promise<void> {
    await Preferences.clear();
  }

  /**
   * Lista todas as chaves do storage
   */
  async keys(): Promise<string[]> {
    const { keys } = await Preferences.keys();
    return keys;
  }
}
