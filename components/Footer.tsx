'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { FiFacebook, FiInstagram, FiTwitter, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'
import { FaWhatsapp, FaYoutube, FaTiktok } from 'react-icons/fa'

interface SocialLinks {
  facebook: string
  twitter: string
  youtube: string
  whatsapp: string
  instagram: string
  tiktok: string
}

interface SiteConfig {
  name: string
  description: string
  email: string
  phone: string
  cnpj: string
  address: string
}

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: '',
    twitter: '',
    youtube: '',
    whatsapp: '',
    instagram: '',
    tiktok: ''
  })
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    name: 'MYDSHOP',
    description: 'Sua loja online completa com os melhores produtos e preços.',
    email: 'contato@mydshop.com.br',
    phone: '',
    cnpj: '',
    address: ''
  })

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/public')
        const data = await response.json()
        if (data) {
          setSocialLinks({
            facebook: data['social.facebook'] || '',
            twitter: data['social.twitter'] || '',
            youtube: data['social.youtube'] || '',
            whatsapp: data['social.whatsapp'] || '',
            instagram: data['social.instagram'] || '',
            tiktok: data['social.tiktok'] || ''
          })
          setSiteConfig({
            name: data['site.name'] || 'MYDSHOP',
            description: data['site.description'] || 'Sua loja online completa com os melhores produtos e preços.',
            email: data['site.email'] || 'contato@mydshop.com.br',
            phone: data['site.phone'] || '',
            cnpj: data['site.cnpj'] || '',
            address: data['site.address'] || ''
          })
        }
      } catch (error) {
        console.error('Erro ao buscar configurações:', error)
      }
    }
    fetchConfig()
  }, [])

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Image 
              src="/logo-animated-white.svg" 
              alt={siteConfig.name} 
              width={180} 
              height={50}
              className="mb-4"
            />
            <p className="text-gray-400 mb-4">
              {siteConfig.description}
            </p>
            
            {/* Informações de Contato */}
            <div className="space-y-2 text-sm text-gray-400 mb-4">
              {siteConfig.email && (
                <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-2 hover:text-white">
                  <FiMail size={14} />
                  {siteConfig.email}
                </a>
              )}
              {siteConfig.phone && (
                <a href={`tel:${siteConfig.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-white">
                  <FiPhone size={14} />
                  {siteConfig.phone}
                </a>
              )}
              {siteConfig.cnpj && (
                <p className="flex items-center gap-2">
                  <span className="text-xs font-bold">CNPJ:</span>
                  {siteConfig.cnpj}
                </p>
              )}
              {siteConfig.address && (
                <p className="flex items-start gap-2">
                  <FiMapPin size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{siteConfig.address}</span>
                </p>
              )}
            </div>

            <div className="flex space-x-4">
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                  <FiFacebook size={20} />
                </a>
              )}
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                  <FiInstagram size={20} />
                </a>
              )}
              {socialLinks.twitter && (
                <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                  <FiTwitter size={20} />
                </a>
              )}
              {socialLinks.youtube && (
                <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                  <FaYoutube size={20} />
                </a>
              )}
              {socialLinks.whatsapp && (
                <a href={`https://wa.me/${socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                  <FaWhatsapp size={20} />
                </a>
              )}
              {socialLinks.tiktok && (
                <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                  <FaTiktok size={20} />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/sobre" className="hover:text-white">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link href="/contato" className="hover:text-white">
                  Contato
                </Link>
              </li>
              <li>
                <Link href="/carreiras" className="hover:text-white">
                  Carreiras
                </Link>
              </li>
              <li>
                <Link href="/vendedor/cadastro" className="hover:text-white">
                  Seja um Parceiro
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/faq" className="hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/envio" className="hover:text-white">
                  Envio
                </Link>
              </li>
              <li>
                <Link href="/devolucoes" className="hover:text-white">
                  Devoluções
                </Link>
              </li>
              <li>
                <Link href="/rastreamento" className="hover:text-white">
                  Rastreamento
                </Link>
              </li>
              <li>
                <Link href="/politica-devolucao" className="hover:text-white">
                  Política de Cancelamento e Devoluções
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/termos" className="hover:text-white">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/politica-privacidade" className="hover:text-white">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-gray-400 mb-4">
              Receba nossas ofertas e novidades
            </p>
            <form className="flex">
              <input
                type="email"
                placeholder="Seu e-mail"
                className="flex-1 px-4 py-2 rounded-l-md text-gray-900"
              />
              <button className="bg-primary-600 px-4 py-2 rounded-r-md hover:bg-primary-700">
                Enviar
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {siteConfig.name}. Todos os direitos reservados.</p>
          <p className="text-sm mt-2 text-gray-500">
            Desenvolvido por{' '}
            <a 
              href="https://www.mydsistemas.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              MYD Facilyta Tecnology
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
