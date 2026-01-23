import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ActionSheetController, LoadingController, ToastController, NavController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AuthService, User } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { getImageUrl } from '../../../core/config/api.config';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: false
})
export class EditProfilePage implements OnInit {
  profileForm: FormGroup;
  user: User | null = null;
  avatarPreview: string | null = null;
  selectedFile: File | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private apiService: ApiService,
    private actionSheetCtrl: ActionSheetController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: [''],
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.profileForm.patchValue({
          name: user.name,
          phone: user.phone || ''
        });
        // Usa getImageUrl para converter URL relativa em absoluta
        this.avatarPreview = user.image ? getImageUrl(user.image) : null;
      }
    });
  }

  /**
   * Abre action sheet para escolher fonte da foto
   */
  async selectImageSource() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Escolher foto',
      buttons: [
        {
          text: 'Câmera',
          icon: 'camera-outline',
          handler: () => this.takePicture(CameraSource.Camera)
        },
        {
          text: 'Galeria',
          icon: 'image-outline',
          handler: () => this.takePicture(CameraSource.Photos)
        },
        {
          text: 'Cancelar',
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  /**
   * Captura foto da câmera ou galeria
   */
  async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source,
        width: 400,
        height: 400
      });

      if (image.dataUrl) {
        this.avatarPreview = image.dataUrl;
        // Converter DataUrl para File
        this.selectedFile = this.dataURLtoFile(image.dataUrl, 'avatar.jpg');
      }
    } catch (error: any) {
      console.error('Erro ao capturar imagem:', error);
      if (error.message !== 'User cancelled photos app') {
        const toast = await this.toastCtrl.create({
          message: 'Erro ao acessar câmera/galeria',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    }
  }

  /**
   * Converte DataURL para File
   */
  private dataURLtoFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Salvar perfil
   */
  async saveProfile() {
    if (this.profileForm.invalid) {
      const toast = await this.toastCtrl.create({
        message: 'Preencha todos os campos corretamente',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Salvando...'
    });
    await loading.present();

    try {
      let imageUrl = this.user?.image;

      // Upload da imagem se houver nova
      if (this.selectedFile) {
        const uploadResponse = await firstValueFrom(
          this.apiService.upload<{ url: string }>('/user/avatar', this.selectedFile, 'avatar')
        );
        imageUrl = uploadResponse.url;
      }

      // Atualizar perfil
      const updateData = {
        name: this.profileForm.value.name,
        phone: this.profileForm.value.phone,
        image: imageUrl
      };

      await this.authService.updateProfile(updateData);

      await loading.dismiss();

      const toast = await this.toastCtrl.create({
        message: 'Perfil atualizado com sucesso!',
        duration: 2000,
        color: 'success'
      });
      await toast.present();

      this.navCtrl.back();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastCtrl.create({
        message: error.message || 'Erro ao atualizar perfil',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * Gera iniciais do nome para avatar padrão
   */
  getInitials(): string {
    if (!this.user?.name) return '?';
    const names = this.user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }
}
