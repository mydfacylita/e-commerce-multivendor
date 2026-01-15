'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiUser, FiBriefcase, FiChevronRight, FiClock, FiAlertCircle, FiX } from 'react-icons/fi';

export default function SellerSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isPending = searchParams?.get('pendente') === 'true';
  const isRejected = searchParams?.get('rejeitado') === 'true';
  const isSuspended = searchParams?.get('suspenso') === 'true';

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
  
  // Alerta de conta suspensa
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-6 rounded-full">
                <FiAlertCircle className="text-red-600" size={64} />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center mb-4 text-gray-900">
              Conta Suspensa
            </h1>
            
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <FiAlertCircle className="text-red-400 flex-shrink-0 mt-1 mr-3" size={24} />
                <div>
                  <p className="text-red-800 font-semibold mb-2">
                    Sua conta de vendedor foi suspensa
                  </p>
                  <p className="text-red-700 text-sm">
                    O acesso às funcionalidades da plataforma está temporariamente bloqueado.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-gray-700">
              <h3 className="font-semibold text-lg">❓ Por que minha conta foi suspensa?</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="mb-3">Possíveis motivos para suspensão:</p>
                <ul className="space-y-2 text-sm pl-4">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Violação dos termos de uso da plataforma</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Produtos inadequados ou proibidos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Problemas com pagamentos ou comissões</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Reclamações recorrentes de clientes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Atividades suspeitas ou fraudulentas</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-900 mb-2">📧 O que fazer agora?</h4>
                <div className="text-blue-800 text-sm space-y-2">
                  <p className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>Verifique seu email para mais informações sobre a suspensão</span>
                  </p>
                  <p className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Entre em contato com nosso suporte para esclarecimentos</span>
                  </p>
                  <p className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Resolva as pendências indicadas pela equipe</span>
                  </p>
                  <p className="flex items-start">
                    <span className="font-bold mr-2">4.</span>
                    <span>Aguarde a análise do caso pela nossa equipe</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => window.location.href = 'mailto:suporte@plataforma.com?subject=Conta Suspensa'}
                className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                📧 Entrar em Contato com Suporte
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-200 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Voltar para Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Alerta de cadastro rejeitado
  if (isRejected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-6 rounded-full">
                <FiX className="text-red-600" size={64} />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center mb-4 text-gray-900">
              Cadastro Não Aprovado
            </h1>
            
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <FiAlertCircle className="text-red-400 flex-shrink-0 mt-1 mr-3" size={24} />
                <div>
                  <p className="text-red-800 font-semibold mb-2">
                    Seu cadastro como vendedor não foi aprovado
                  </p>
                  <p className="text-red-700 text-sm">
                    Após análise, identificamos que seu cadastro não atende aos requisitos necessários.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-gray-700">
              <h3 className="font-semibold text-lg">❓ Por que não foi aprovado?</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="mb-3">Motivos comuns para reprovação:</p>
                <ul className="space-y-2 text-sm pl-4">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Documentos inválidos ou ilegíveis</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Informações bancárias incorretas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Dados cadastrais inconsistentes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>Não atende aos requisitos da plataforma</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-900 mb-2">🔄 Posso tentar novamente?</h4>
                <p className="text-blue-800 text-sm">
                  Sim! Você pode corrigir as informações e enviar um novo cadastro. Entre em contato com nosso suporte para saber exatamente o que precisa ser ajustado.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => window.location.href = 'mailto:suporte@plataforma.com?subject=Cadastro Rejeitado'}
                className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                📧 Falar com Suporte
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-200 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Voltar para Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Alerta de cadastro pendente
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-yellow-100 p-6 rounded-full">
                <FiClock className="text-yellow-600" size={64} />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center mb-4 text-gray-900">
              Cadastro em Análise
            </h1>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <FiAlertCircle className="text-yellow-400 flex-shrink-0 mt-1 mr-3" size={24} />
                <div>
                  <p className="text-yellow-800 font-semibold mb-2">
                    Seu cadastro foi enviado e está aguardando aprovação
                  </p>
                  <p className="text-yellow-700 text-sm">
                    Nossa equipe está analisando suas informações. Este processo geralmente leva de 24 a 48 horas úteis.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-gray-700">
              <h3 className="font-semibold text-lg">📋 O que acontece agora?</h3>
              
              <div className="pl-4 space-y-3">
                <div className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">1.</span>
                  <p>Nossa equipe irá verificar todos os seus dados</p>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">2.</span>
                  <p>Você receberá um email de confirmação quando for aprovado</p>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">3.</span>
                  <p>Após aprovação, você poderá escolher um plano e começar a vender</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Dica:</h4>
                <p className="text-blue-800 text-sm">
                  Enquanto aguarda, você pode explorar nossa plataforma e ver como outros vendedores estão vendendo seus produtos.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Voltar para Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
