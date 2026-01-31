/**
 * 🔍 API - Status do Cron de Consistência
 */

import { NextResponse } from 'next/server'
import { getConsistencyCronStatus } from '@/lib/order-consistency-cron'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const status = getConsistencyCronStatus()

    return NextResponse.json({
      success: true,
      status
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
