const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

async function convertSvgToPng() {
  const svgPath = path.join(__dirname, 'public', 'logo-final.svg')
  const pngPath = path.join(__dirname, 'public', 'logo.png')
  
  try {
    const svgBuffer = fs.readFileSync(svgPath)
    
    await sharp(svgBuffer)
      .resize(520, 140) // 2x para melhor qualidade
      .png()
      .toFile(pngPath)
    
    console.log('✅ Logo convertida com sucesso!')
    console.log(`   Arquivo: ${pngPath}`)
    
    // Verificar tamanho
    const stats = fs.statSync(pngPath)
    console.log(`   Tamanho: ${(stats.size / 1024).toFixed(2)} KB`)
  } catch (error) {
    console.error('❌ Erro ao converter logo:', error.message)
  }
}

convertSvgToPng()
