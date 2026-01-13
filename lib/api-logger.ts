import { prisma } from './prisma'

interface LogApiParams {
  method: string
  endpoint: string
  statusCode: number
  userId?: string
  userRole?: string
  sellerId?: string
  sellerName?: string
  requestBody?: any
  responseBody?: any
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  duration?: number
}

export async function logApi(params: LogApiParams) {
  try {
    await prisma.apiLog.create({
      data: {
        method: params.method,
        endpoint: params.endpoint,
        statusCode: params.statusCode,
        userId: params.userId,
        userRole: params.userRole,
        sellerId: params.sellerId,
        sellerName: params.sellerName,
        requestBody: params.requestBody ? JSON.stringify(params.requestBody) : null,
        responseBody: params.responseBody ? JSON.stringify(params.responseBody) : null,
        errorMessage: params.errorMessage,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        duration: params.duration,
      },
    })
  } catch (error) {
    // Não queremos que erros de log quebrem a API
    console.error('❌ Erro ao salvar log:', error)
  }
}
