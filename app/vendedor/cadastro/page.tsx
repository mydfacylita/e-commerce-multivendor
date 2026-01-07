'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiUser, FiBriefcase, FiChevronRight } from 'react-icons/fi';

export default function SellerSignupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Verificar autenticação ANTES de mostrar a página
  useEffect(() => {
    if (status === 'loading') return; // Aguarda carregar
    
    if (status === 'unauthenticated') {
      // NÃO está logado - redireciona para login com callback
      router.push('/login?callbackUrl=/vendedor/cadastro');
    }
  }, [status, router]);

  // Mostrar loading enquanto verifica autenticação
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, não mostra nada (vai redirecionar)
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Venda na Nossa Plataforma
          </h1>
          <p className="text-xl text-gray-600">
            Escolha como deseja se cadastrar como vendedor
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Pessoa Física */}
          <div
            onClick={() => router.push('/vendedor/cadastro/pf')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 p-6 rounded-full">
                <FiUser className="text-blue-600" size={48} />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-900">
              Pessoa Física
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              Para você que vende como pessoa física
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <FiChevronRight className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Cadastro rápido com CPF</span>
              </li>
              <li className="flex items-start">
                <FiChevronRight className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Comece a vender imediatamente</span>
              </li>
              <li className="flex items-start">
                <FiChevronRight className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Ideal para pequenos vendedores</span>
              </li>
              <li className="flex items-start">
                <FiChevronRight className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Sem necessidade de CNPJ</span>
              </li>
            </ul>

            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Cadastrar como Pessoa Física
            </button>
          </div>

          {/* Pessoa Jurídica */}
          <div
            onClick={() => router.push('/vendedor/cadastro/pj')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-indigo-100 p-6 rounded-full">
                <FiBriefcase className="text-indigo-600" size={48} />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-900">
              Pessoa Jurídica
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              Para empresas e lojas estabelecidas
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <FiChevronRight className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Cadastro com CNPJ</span>
              </li>
              <li className="flex items-start">
                <FiChevronRight className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Maior credibilidade</span>
              </li>
              <li className="flex items-start">
                <FiChevronRight className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Vendas em maior volume</span>
              </li>
              <li className="flex items-start">
                <FiChevronRight className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Emissão de notas fiscais</span>
              </li>
            </ul>

            <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
              Cadastrar como Pessoa Jurídica
            </button>
          </div>
        </div>

        {/* Benefícios */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-6 text-gray-900">
            Por que vender conosco?
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <h4 className="font-bold mb-2">Comissões Baixas</h4>
              <p className="text-gray-600 text-sm">
                Taxa competitiva para maximizar seus lucros
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <h4 className="font-bold mb-2">Visibilidade</h4>
              <p className="text-gray-600 text-sm">
                Seus produtos vistos por milhares de clientes
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h4 className="font-bold mb-2">Gestão Completa</h4>
              <p className="text-gray-600 text-sm">
                Dashboard para controlar vendas e estoque
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600">
            Já tem uma conta?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:underline font-semibold"
            >
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
