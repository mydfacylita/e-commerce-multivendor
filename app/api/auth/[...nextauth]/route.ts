import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
