import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'USER' | 'ADMIN' | 'SELLER'
      cpf?: string
      phone?: string
    } & DefaultSession['user']
  }

  interface User {
    role: 'USER' | 'ADMIN' | 'SELLER'
    cpf?: string
    phone?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'USER' | 'ADMIN' | 'SELLER'
    cpf?: string
    phone?: string
  }
}
