/**
 * 🔐 AUTH SERVICE
 * 
 * Serviço de autenticação para o app MYDSHOP.
 * Gerencia login, registro, logout e estado do usuário.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';
import { NavController } from '@ionic/angular';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  role: 'USER' | 'SELLER' | 'ADMIN';
  createdAt: string;
  address?: {
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = new BehaviorSubject<User | null>(null);
  private isAuthenticated = new BehaviorSubject<boolean>(false);

  // Observables públicos
  public currentUser$ = this.currentUser.asObservable();
  public user$ = this.currentUser.asObservable(); // Alias
  public isAuthenticated$ = this.isAuthenticated.asObservable();

  constructor(
    private api: ApiService,
    private storage: StorageService,
    private navCtrl: NavController
  ) {
    this.loadUserFromStorage();
  }

  /**
   * Carrega usuário do storage ao iniciar
   */
  private async loadUserFromStorage(): Promise<void> {
    try {
      const user = await this.storage.get<User>(environment.auth.userKey);
      const token = await this.storage.get<string>(environment.auth.tokenKey);

      if (user && token) {
        this.currentUser.next(user);
        this.isAuthenticated.next(true);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário do storage:', error);
    }
  }

  /**
   * Login com email e senha
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const request = await this.api.post<LoginResponse>('/auth/login', { email, password });
      const response = await firstValueFrom(request);

      // Salvar token e usuário
      await this.storage.set(environment.auth.tokenKey, response.token);
      if (response.refreshToken) {
        await this.storage.set(environment.auth.refreshTokenKey, response.refreshToken);
      }
      await this.storage.set(environment.auth.userKey, response.user);

      // Atualizar estado
      this.currentUser.next(response.user);
      this.isAuthenticated.next(true);

      return response.user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Registro de novo usuário
   */
  async register(data: RegisterData): Promise<User> {
    try {
      const request = await this.api.post<LoginResponse>('/auth/register', data);
      const response = await firstValueFrom(request);

      // Salvar token e usuário (auto-login após registro)
      await this.storage.set(environment.auth.tokenKey, response.token);
      await this.storage.set(environment.auth.userKey, response.user);

      // Atualizar estado
      this.currentUser.next(response.user);
      this.isAuthenticated.next(true);

      return response.user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    // Limpar storage
    await this.storage.remove(environment.auth.tokenKey);
    await this.storage.remove(environment.auth.refreshTokenKey);
    await this.storage.remove(environment.auth.userKey);

    // Limpar estado
    this.currentUser.next(null);
    this.isAuthenticated.next(false);

    // Navegar para login
    this.navCtrl.navigateRoot('/auth/login');
  }

  /**
   * Recuperação de senha
   */
  async forgotPassword(email: string): Promise<void> {
    const request = await this.api.post<void>('/auth/forgot-password', { email });
    await firstValueFrom(request);
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const request = await this.api.put<User>('/user/profile', data);
    const updatedUser = await firstValueFrom(request);

    // Atualizar storage e estado
    const currentUserData = this.currentUser.value;
    const newUserData = { ...currentUserData, ...updatedUser };
    await this.storage.set(environment.auth.userKey, newUserData);
    this.currentUser.next(newUserData as User);

    return newUserData as User;
  }

  /**
   * Alterar senha
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const request = await this.api.post<void>('/auth/change-password', {
      currentPassword,
      newPassword
    });
    await firstValueFrom(request);
  }

  /**
   * Verificar se usuário está autenticado
   */
  async checkAuth(): Promise<boolean> {
    const token = await this.storage.get<string>(environment.auth.tokenKey);
    return !!token;
  }

  /**
   * Obter usuário atual
   */
  getUser(): User | null {
    return this.currentUser.value;
  }
}
