const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Caminho da imagem fonte
const sourceImage = path.join(__dirname, '..', 'public', 'icone_mydshop.png');

// Cores do tema
const splashBackgroundColor = '#0A1929';

// Diretórios de saída iOS
const appIconDir = path.join(__dirname, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const splashDir = path.join(__dirname, 'ios/App/App/Assets.xcassets/Splash.imageset');

async function generateiOSAssets() {
    console.log('🍎 Gerando assets para iOS...\n');

    // Verificar se a imagem fonte existe
    if (!fs.existsSync(sourceImage)) {
        console.error('❌ Arquivo icone_mydshop.png não encontrado!');
        process.exit(1);
    }

    // Carregar imagem e obter metadados
    const metadata = await sharp(sourceImage).metadata();
    console.log(`📐 Imagem fonte: ${metadata.width}x${metadata.height}`);

    // A imagem é 1536x1024, vamos extrair a parte central quadrada (1024x1024)
    const squareSize = Math.min(metadata.width, metadata.height);
    const left = Math.floor((metadata.width - squareSize) / 2);
    const top = Math.floor((metadata.height - squareSize) / 2);

    console.log(`✂️  Extraindo região central: ${squareSize}x${squareSize}`);

    // Extrair a região central quadrada
    const squareBuffer = await sharp(sourceImage)
        .extract({ left, top, width: squareSize, height: squareSize })
        .toBuffer();

    // =====================================================
    // 1. GERAR APP ICON (1024x1024 para iOS)
    // =====================================================
    console.log('\n📱 Gerando App Icon iOS...');
    
    // iOS requer ícone de 1024x1024 sem transparência
    const appIconPath = path.join(appIconDir, 'AppIcon-512@2x.png');
    
    await sharp(squareBuffer)
        .resize(1024, 1024, { fit: 'contain', background: splashBackgroundColor })
        .flatten({ background: splashBackgroundColor }) // Remove transparência
        .png()
        .toFile(appIconPath);
    
    console.log(`   ✅ AppIcon-512@2x.png (1024x1024)`);

    // =====================================================
    // 2. GERAR SPLASH SCREENS (2732x2732 para todos os iPads)
    // =====================================================
    console.log('\n🖼️  Gerando Splash Screens iOS...');
    
    const splashSize = 2732;
    const logoSize = Math.floor(splashSize * 0.25); // Logo 25% do tamanho
    
    // Criar splash screen com logo centralizado
    const logoBuffer = await sharp(squareBuffer)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

    const splashBuffer = await sharp({
        create: {
            width: splashSize,
            height: splashSize,
            channels: 4,
            background: splashBackgroundColor
        }
    })
    .composite([{
        input: logoBuffer,
        gravity: 'center'
    }])
    .png()
    .toBuffer();

    // Salvar nas 3 escalas
    const splashFiles = [
        'splash-2732x2732.png',
        'splash-2732x2732-1.png',
        'splash-2732x2732-2.png'
    ];

    for (const filename of splashFiles) {
        const splashPath = path.join(splashDir, filename);
        await sharp(splashBuffer).toFile(splashPath);
        console.log(`   ✅ ${filename}`);
    }

    // =====================================================
    // 3. GERAR LAUNCH SCREEN STORYBOARD ASSETS
    // =====================================================
    console.log('\n🚀 Configurações adicionais...');
    
    // Verificar se LaunchScreen.storyboard existe
    const storyboardPath = path.join(__dirname, 'ios/App/App/Base.lproj/LaunchScreen.storyboard');
    if (fs.existsSync(storyboardPath)) {
        console.log('   ℹ️  LaunchScreen.storyboard encontrado');
    }

    console.log('\n✅ Assets iOS gerados com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Abra o projeto no Xcode: ios/App/App.xcodeproj');
    console.log('   2. Verifique os assets em Assets.xcassets');
    console.log('   3. Configure o LaunchScreen.storyboard se necessário');
    console.log('   4. Build e teste no simulador ou dispositivo');
}

generateiOSAssets().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
