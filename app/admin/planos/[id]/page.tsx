import NovoPlanoPage from '../novo/page'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function EditarPlanoPage({ params }: { params: { id: string } }) {
  return <NovoPlanoPage params={params} />
}