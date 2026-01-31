import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Mapeamento de extensões para MIME types
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
};

// CORS headers para imagens
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = params.path.join('/');
    
    // Construir caminho do arquivo
    const filePath = path.join(process.cwd(), 'public', imagePath);
    
    // Verificar se arquivo existe
    if (!existsSync(filePath)) {
      return new NextResponse('Image not found', {
        status: 404,
        headers: corsHeaders,
      });
    }
    
    // Obter extensão e MIME type
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Ler arquivo
    const fileBuffer = await readFile(filePath);
    
    // Retornar imagem com CORS headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Image API] Error:', error);
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = params.path.join('/');
    const filePath = path.join(process.cwd(), 'public', imagePath);
    
    if (!existsSync(filePath)) {
      return new NextResponse(null, {
        status: 404,
        headers: corsHeaders,
      });
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': mimeType,
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
