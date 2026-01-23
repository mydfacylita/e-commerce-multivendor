import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { printerId } = await request.json()

    // Por enquanto, apenas retorna sucesso
    // Futuramente, podemos integrar com PrintNode, CUPS, ou outro serviço de impressão
    console.log(`[PrintTest] Teste de impressão solicitado para: ${printerId}`)

    // Retornar uma página de teste HTML que pode ser impressa via window.print()
    const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Teste de Impressão</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20mm;
    }
    .test-page {
      border: 2px solid #333;
      padding: 20px;
      text-align: center;
    }
    h1 { margin: 0 0 20px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5px;
      margin: 20px 0;
    }
    .grid div {
      height: 20px;
      background: #333;
    }
    .info {
      text-align: left;
      margin-top: 20px;
      font-size: 12px;
    }
    @media print {
      body { padding: 10mm; }
    }
  </style>
</head>
<body>
  <div class="test-page">
    <h1>🖨️ TESTE DE IMPRESSÃO</h1>
    <p>Se você consegue ler este texto, a impressora está funcionando!</p>
    
    <div class="grid">
      <div></div><div style="background:#666"></div><div></div><div style="background:#999"></div>
      <div style="background:#999"></div><div></div><div style="background:#666"></div><div></div>
      <div></div><div style="background:#666"></div><div></div><div style="background:#999"></div>
      <div style="background:#999"></div><div></div><div style="background:#666"></div><div></div>
    </div>

    <p style="font-size: 8px;">Texto pequeno (8px)</p>
    <p style="font-size: 10px;">Texto médio (10px)</p>
    <p style="font-size: 12px;">Texto normal (12px)</p>
    <p style="font-size: 14px;">Texto grande (14px)</p>

    <div class="info">
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      <p><strong>Impressora:</strong> ${printerId}</p>
      <p><strong>Sistema:</strong> MYDSHOP E-commerce</p>
    </div>

    <div style="margin-top: 30px;">
      <svg width="200" height="50">
        <rect x="0" y="0" width="3" height="50" fill="black"/>
        <rect x="6" y="0" width="1" height="50" fill="black"/>
        <rect x="10" y="0" width="2" height="50" fill="black"/>
        <rect x="15" y="0" width="1" height="50" fill="black"/>
        <rect x="18" y="0" width="3" height="50" fill="black"/>
        <rect x="24" y="0" width="1" height="50" fill="black"/>
        <rect x="28" y="0" width="2" height="50" fill="black"/>
        <rect x="33" y="0" width="1" height="50" fill="black"/>
        <rect x="36" y="0" width="3" height="50" fill="black"/>
        <rect x="42" y="0" width="1" height="50" fill="black"/>
        <rect x="46" y="0" width="2" height="50" fill="black"/>
        <rect x="51" y="0" width="1" height="50" fill="black"/>
        <rect x="55" y="0" width="3" height="50" fill="black"/>
        <rect x="61" y="0" width="1" height="50" fill="black"/>
        <rect x="65" y="0" width="2" height="50" fill="black"/>
        <rect x="70" y="0" width="1" height="50" fill="black"/>
      </svg>
      <p style="font-size: 10px; margin-top: 5px;">TESTE123456BR</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
    `.trim()

    return new NextResponse(testHtml, {
      headers: {
        'Content-Type': 'text/html'
      }
    })
  } catch (error) {
    console.error('Erro no teste de impressão:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
