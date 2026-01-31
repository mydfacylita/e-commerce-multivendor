'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiPause, FiArrowLeft, FiExternalLink, FiCreditCard, FiDollarSign } from 'react-icons/fi';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function SellerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [seller, setSeller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [accountData, setAccountData] = useState<any>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);

  useEffect(() => {
    fetchSeller();
  }, []);

  useEffect(() => {
    if (seller) {
      fetchAccountData();
    }
  }, [seller]);

  const fetchSeller = async () => {
    try {
      const response = await fetch(`/api/admin/sellers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSeller(data.seller);
      } else {
        toast.error('Vendedor não encontrado');
        router.push('/admin/vendedores');
      }
    } catch (error) {
      console.error('Erro ao buscar vendedor:', error);
      toast.error('Erro ao buscar vendedor');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountData = async () => {
    try {
      const response = await fetch(`/api/admin/sellers/${params.id}/account`);
      if (response.ok) {
        const data = await response.json();
        setAccountData(data);
      }
    } catch (error) {
      console.error('Erro ao buscar conta:', error);
    }
  };

  const handleCreateAccount = async () => {
    if (!confirm('Deseja criar uma conta digital para este vendedor?')) return;
    
    setCreatingAccount(true);
    try {
      const response = await fetch(`/api/admin/sellers/${params.id}/account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Conta digital criada com sucesso!');
        fetchAccountData();
      } else {
        toast.error(data.error || 'Erro ao criar conta');
      }
    } catch (error) {
      toast.error('Erro ao criar conta digital');
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const confirmMessages = {
      ACTIVE: 'Deseja aprovar este vendedor?',
      REJECTED: 'Deseja rejeitar este vendedor?',
      SUSPENDED: 'Deseja suspender este vendedor?',
    };

    if (!confirm(confirmMessages[newStatus as keyof typeof confirmMessages])) return;

    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/sellers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }

      toast.success('Status atualizado com sucesso!');
      fetchSeller();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!seller) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/vendedores"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <FiArrowLeft size={20} />
          Voltar para lista
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{seller.storeName}</h1>
            <p className="text-gray-600">Gerenciar vendedor</p>
          </div>
          <Link
            href={`/loja/${seller.storeSlug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiExternalLink size={20} />
            Ver Loja Pública
          </Link>
        </div>
      </div>

      {/* Ações de Status */}
      {seller.status === 'PENDING' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-4">Ações Necessárias</h3>
          <div className="flex gap-3">
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <FiCheck size={20} />
              Aprovar Vendedor
            </button>
            <button
              onClick={() => handleStatusChange('REJECTED')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <FiX size={20} />
              Rejeitar Vendedor
            </button>
          </div>
        </div>
      )}

      {seller.status === 'ACTIVE' && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ações</h3>
          <button
            onClick={() => handleStatusChange('SUSPENDED')}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <FiPause size={20} />
            Suspender Vendedor
          </button>
        </div>
      )}

      {seller.status === 'SUSPENDED' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-red-900 mb-4">Vendedor Suspenso</h3>
          <button
            onClick={() => handleStatusChange('ACTIVE')}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FiCheck size={20} />
            Reativar Vendedor
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Informações da Loja */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Informações da Loja</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600">Nome da Loja:</span>
              <p className="font-medium">{seller.storeName}</p>
            </div>
            <div>
              <span className="text-gray-600">URL:</span>
              <p className="font-medium">/loja/{seller.storeSlug}</p>
            </div>
            {seller.storeDescription && (
              <div>
                <span className="text-gray-600">Descrição:</span>
                <p className="font-medium">{seller.storeDescription}</p>
              </div>
            )}
            <div>
              <span className="text-gray-600">Comissão:</span>
              <p className="font-medium">{seller.commission}%</p>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <p className="font-medium">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  seller.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  seller.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  seller.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {seller.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Dados do Vendedor */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Dados do Vendedor</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600">Nome:</span>
              <p className="font-medium">{seller.user.name}</p>
            </div>
            <div>
              <span className="text-gray-600">Email:</span>
              <p className="font-medium">{seller.user.email}</p>
            </div>
            <div>
              <span className="text-gray-600">Tipo:</span>
              <p className="font-medium">
                {seller.sellerType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </p>
            </div>
            {seller.sellerType === 'PF' && seller.cpf && (
              <div>
                <span className="text-gray-600">CPF:</span>
                <p className="font-medium">{seller.cpf}</p>
              </div>
            )}
            {seller.sellerType === 'PJ' && (
              <>
                {seller.cnpj && (
                  <div>
                    <span className="text-gray-600">CNPJ:</span>
                    <p className="font-medium">{seller.cnpj}</p>
                  </div>
                )}
                {seller.razaoSocial && (
                  <div>
                    <span className="text-gray-600">Razão Social:</span>
                    <p className="font-medium">{seller.razaoSocial}</p>
                  </div>
                )}
              </>
            )}
            <div>
              <span className="text-gray-600">Cadastro em:</span>
              <p className="font-medium">
                {new Date(seller.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Endereço</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600">CEP:</span>
              <p className="font-medium">{seller.cep}</p>
            </div>
            <div>
              <span className="text-gray-600">Endereço:</span>
              <p className="font-medium">
                {seller.endereco}, {seller.numero}
                {seller.complemento && ` - ${seller.complemento}`}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Bairro:</span>
              <p className="font-medium">{seller.bairro}</p>
            </div>
            <div>
              <span className="text-gray-600">Cidade/Estado:</span>
              <p className="font-medium">{seller.cidade}, {seller.estado}</p>
            </div>
          </div>
        </div>

        {/* Dados Bancários */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Dados Bancários</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600">Banco:</span>
              <p className="font-medium">{seller.banco}</p>
            </div>
            <div>
              <span className="text-gray-600">Agência:</span>
              <p className="font-medium">{seller.agencia}</p>
            </div>
            <div>
              <span className="text-gray-600">Conta:</span>
              <p className="font-medium">{seller.conta} ({seller.tipoConta})</p>
            </div>
            {seller.chavePix && (
              <div>
                <span className="text-gray-600">Chave PIX:</span>
                <p className="font-medium">{seller.chavePix}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conta Digital MYDSHOP */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FiCreditCard className="text-primary-600" />
            Conta Digital MYDSHOP
          </h2>
          {accountData?.hasAccount && (
            <Link
              href={`/admin/vendedores/contas/${accountData.account.id}`}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Ver detalhes →
            </Link>
          )}
        </div>

        {accountData === null ? (
          <div className="text-gray-500 text-center py-4">Carregando...</div>
        ) : !accountData.hasAccount ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 mb-4">
              Este vendedor ainda não possui uma conta digital.
            </p>
            <button
              onClick={handleCreateAccount}
              disabled={creatingAccount}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <FiCreditCard size={18} />
              {creatingAccount ? 'Criando...' : 'Criar Conta Digital'}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <span className="text-gray-600 text-sm">Número da Conta</span>
              <p className="font-mono font-bold text-lg">{accountData.account.accountNumber}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <span className="text-gray-600 text-sm">Saldo Disponível</span>
              <p className="font-bold text-lg text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(accountData.account.balance)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <span className="text-gray-600 text-sm">Status</span>
              <p className={`font-bold text-lg ${
                accountData.account.status === 'ACTIVE' ? 'text-green-600' :
                accountData.account.status === 'PENDING' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {accountData.account.status === 'ACTIVE' ? 'Ativa' :
                 accountData.account.status === 'PENDING' ? 'Pendente' :
                 accountData.account.status === 'BLOCKED' ? 'Bloqueada' :
                 accountData.account.status}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Produtos */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">
          Produtos ({seller._count.products})
        </h2>
        {seller._count.products === 0 ? (
          <p className="text-gray-500">Nenhum produto cadastrado ainda</p>
        ) : (
          <Link
            href={`/admin/produtos?vendedor=${seller.id}`}
            className="text-blue-600 hover:underline"
          >
            Ver todos os produtos deste vendedor →
          </Link>
        )}
      </div>
    </div>
  );
}
