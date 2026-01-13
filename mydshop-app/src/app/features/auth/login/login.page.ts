import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AppConfigService, BrandConfig, TextsConfig, ThemeConfig } from '../../../core/services/app-config.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  returnUrl = '/tabs/home';
  
  // Configurações dinâmicas
  brand: BrandConfig | null = null;
  texts: TextsConfig | null = null;
  theme: ThemeConfig | null = null;
  brandParts: { text: string; highlight: boolean }[] = [
    { text: 'MYD', highlight: true },
    { text: 'SHOP', highlight: false }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private appConfig: AppConfigService,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
    
    // Capturar URL de retorno
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/tabs/home';
    });
  }

  ngOnInit() {
    // Carregar configurações
    this.appConfig.config$.subscribe(config => {
      this.brand = config.brand;
      this.texts = config.texts;
      this.theme = config.theme;
      this.brandParts = this.appConfig.getStyledBrandName();
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    const loading = await this.loadingCtrl.create({
      message: 'Entrando...'
    });
    await loading.present();

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.login(email, password);
      
      await loading.dismiss();
      this.router.navigateByUrl(this.returnUrl);
    } catch (error: any) {
      await loading.dismiss();
      
      const toast = await this.toastCtrl.create({
        message: error.message || 'Erro ao fazer login',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  goToRegister() {
    this.router.navigate(['/auth/register'], {
      queryParams: { returnUrl: this.returnUrl }
    });
  }

  goToForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }
}
