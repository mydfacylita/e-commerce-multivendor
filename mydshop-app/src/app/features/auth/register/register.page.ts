import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AppConfigService } from '../../../core/services/app-config.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit, OnDestroy {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  
  // Configurações dinâmicas
  brand: any = {};
  texts: any = {};
  theme: any = {};
  brandParts: { text: string; highlight: boolean }[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private appConfigService: AppConfigService
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }
  
  ngOnInit() {
    // Carregar configurações
    this.subscriptions.push(
      this.appConfigService.brand$.subscribe(brand => {
        this.brand = brand;
        this.brandParts = this.appConfigService.getStyledBrandName();
      })
    );
    
    this.subscriptions.push(
      this.appConfigService.texts$.subscribe(texts => this.texts = texts)
    );
    
    this.subscriptions.push(
      this.appConfigService.theme$.subscribe(theme => this.theme = theme)
    );
  }
  
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    
    return null;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  formatPhone(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    
    if (value.length > 7) {
      value = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7)}`;
    } else if (value.length > 2) {
      value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    
    this.registerForm.patchValue({ phone: value });
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Criando sua conta...',
      spinner: 'crescent'
    });
    await loading.present();

    const { name, email, phone, password } = this.registerForm.value;

    try {
      await this.authService.register({ name, email, phone, password });
      await loading.dismiss();
      
      const toast = await this.toastController.create({
        message: 'Conta criada com sucesso!',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
      
      this.router.navigate(['/tabs/home']);
    } catch (error: any) {
      await loading.dismiss();
      
      const toast = await this.toastController.create({
        message: error?.message || 'Erro ao criar conta. Tente novamente.',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
