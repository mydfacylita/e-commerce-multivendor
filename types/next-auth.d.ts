import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'USER' | 'ADMIN' | 'SELLER'
      cpf?: string
      phone?: string
      isAdminStaff?: boolean
    } & DefaultSession['user']
  }

  interface User {
    role: 'USER' | 'ADMIN' | 'SELLER'
    cpf?: string
    phone?: string
    isAdminStaff?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'USER' | 'ADMIN' | 'SELLER'
    cpf?: string
    phone?: string
    isAdminStaff?: boolean
  }
}
