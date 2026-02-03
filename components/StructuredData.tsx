'use client'

interface OrganizationSchemaProps {
  name?: string
  url?: string
  logo?: string
  description?: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  socialLinks?: string[]
}

export default function OrganizationSchema({
  name = 'MYDSHOP',
  url = 'https://mydshop.com.br',
  logo = 'https://mydshop.com.br/logo.png',
  description = 'Marketplace online com produtos de qualidade e preços imbatíveis',
  email = 'contato@mydshop.com.br',
  phone = '+5598991269315',
  address = {
    street: 'Av. Dos Holandeses, 15',
    city: 'São Luis',
    state: 'MA',
    postalCode: '65065-180',
    country: 'BR',
  },
  socialLinks = [],
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    description,
    email,
    telephone: phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    sameAs: socialLinks,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

interface WebsiteSchemaProps {
  name?: string
  url?: string
  description?: string
}

export function WebsiteSchema({
  name = 'MYDSHOP',
  url = 'https://mydshop.com.br',
  description = 'Marketplace online com produtos de qualidade e preços imbatíveis',
}: WebsiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/produtos?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

interface ProductSchemaProps {
  name: string
  description: string
  image: string | string[]
  price: number
  currency?: string
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  sku?: string
  brand?: string
  url: string
  rating?: {
    value: number
    count: number
  }
}

export function ProductSchema({
  name,
  description,
  image,
  price,
  currency = 'BRL',
  availability = 'InStock',
  sku,
  brand,
  url,
  rating,
}: ProductSchemaProps) {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: description.substring(0, 500), // Limitar descrição
    image: Array.isArray(image) ? image : [image],
    url,
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      seller: {
        '@type': 'Organization',
        name: 'MYDSHOP',
      },
    },
  }

  if (sku) schema.sku = sku
  if (brand) schema.brand = { '@type': 'Brand', name: brand }

  if (rating && rating.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.value.toFixed(1),
      reviewCount: rating.count,
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

interface BreadcrumbSchemaProps {
  items: Array<{
    name: string
    url: string
  }>
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

interface LocalBusinessSchemaProps {
  name?: string
  url?: string
  image?: string
  telephone?: string
  email?: string
  address?: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  priceRange?: string
}

export function LocalBusinessSchema({
  name = 'MYDSHOP',
  url = 'https://mydshop.com.br',
  image = 'https://mydshop.com.br/logo.png',
  telephone = '+5598991269315',
  email = 'contato@mydshop.com.br',
  address = {
    street: 'Av. Dos Holandeses, 15',
    city: 'São Luis',
    state: 'MA',
    postalCode: '65065-180',
    country: 'BR',
  },
  priceRange = '$$',
}: LocalBusinessSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name,
    url,
    image,
    telephone,
    email,
    priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
