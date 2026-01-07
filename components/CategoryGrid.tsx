import Link from 'next/link'
import Image from 'next/image'

interface Category {
  id: string
  name: string
  slug: string
  image?: string | null
}

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/categorias/${category.slug}`}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition text-center group"
        >
          <div className="relative h-24 mb-4">
            {category.image ? (
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-contain group-hover:scale-110 transition"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-4xl">
                📦
              </div>
            )}
          </div>
          <h3 className="font-semibold group-hover:text-primary-600">
            {category.name}
          </h3>
        </Link>
      ))}
    </div>
  )
}
