const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconPath = 'C:/xampp/htdocs/myd_adm/Modules/e-comece/public/icone_mydshop.png';
const resPath = './android/app/src/main/res';

// Tamanhos para ícones normais
const sizes = [
  { folder: 'mipmap-mdpi', size: 48, foreground: 108 },
  { folder: 'mipmap-hdpi', size: 72, foreground: 162 },
  { folder: 'mipmap-xhdpi', size: 96, foreground: 216 },
  { folder: 'mipmap-xxhdpi', size: 144, foreground: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, foreground: 432 },
];

async function generateIcons() {
  // Imagem original é 1536x1024, extrair o quadrado central de 1024x1024
  const extractedIcon = await sharp(iconPath)
    .extract({ left: 256, top: 0, width: 1024, height: 1024 })
    .toBuffer();
  
  for (const { folder, size, foreground } of sizes) {
    const outputPath = path.join(resPath, folder);
    
    // ic_launcher.png - ícone normal (com fundo da imagem)
    await sharp(extractedIcon)
      .resize(size, size, { 
        kernel: sharp.kernel.lanczos3,
        fit: 'cover'
      })
      .png({ compressionLevel: 0 })
      .toFile(path.join(outputPath, 'ic_launcher.png'));
    
    // ic_launcher_round.png - ícone redondo
    await sharp(extractedIcon)
      .resize(size, size, { 
        kernel: sharp.kernel.lanczos3,
        fit: 'cover'
      })
      .png({ compressionLevel: 0 })
      .toFile(path.join(outputPath, 'ic_launcher_round.png'));
    
    // ic_launcher_foreground.png - Para Adaptive Icons
    // Precisa ser MENOR para o Android não fazer zoom excessivo
    // O ícone ocupa apenas ~44% do foreground (para safe zone)
    const iconSize = Math.floor(foreground * 0.44);
    const padding = Math.floor((foreground - iconSize) / 2);
    
    // Criar fundo transparente e colocar ícone no centro
    await sharp(extractedIcon)
      .resize(iconSize, iconSize, { 
        kernel: sharp.kernel.lanczos3,
        fit: 'cover'
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // TRANSPARENTE
      })
      .png({ compressionLevel: 0 })
      .toFile(path.join(outputPath, 'ic_launcher_foreground.png'));
    
    console.log(`✓ ${folder} (icon: ${size}px, foreground: ${foreground}px, inner: ${iconSize}px)`);
  }
  
  // Splash screen
  await sharp(extractedIcon)
    .resize(512, 512, { 
      kernel: sharp.kernel.lanczos3,
      fit: 'cover'
    })
    .png({ compressionLevel: 0 })
    .toFile(path.join(resPath, 'drawable', 'splash.png'));
  console.log(`✓ drawable/splash.png (512x512)`);
  
  console.log('\n✅ Ícones gerados com sucesso!');
}

generateIcons().catch(console.error);
