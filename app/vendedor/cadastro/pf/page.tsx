'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

export default function SellerSignupPFPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // Verificar autenticação ANTES de mostrar a página
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/vendedor/cadastro/pf');
      return;
    }

    // Se já é vendedor, redireciona para dashboard
    if (session?.user?.role === 'SELLER') {
      checkIfAlreadySeller();
    }
  }, [status, session, router]);

  const checkIfAlreadySeller = async () => {
    try {
      const response = await fetch('/api/seller/register');
      if (response.ok) {
        // Já tem cadastro de vendedor
        toast('Você já está cadastrado como vendedor!');
        router.push('/vendedor/dashboard');
      }
    } catch (error) {
      // Não tem cadastro ainda, pode continuar
    }
  };

  // Mostrar loading enquanto verifica
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const [formData, setFormData] = useState({
    // Informações da Loja
    storeName: '',
    storeDescription: '',
    
    // Dados Pessoais
    cpf: '',
    rg: '',
    dataNascimento: '',
    
    // Endereço
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    
    // Dados Bancários
    banco: '',
    agencia: '',
    conta: '',
    tipoConta: 'corrente',
    chavePix: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const buscarCep = async () => {
    if (formData.cep.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${formData.cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData({
          ...formData,
          endereco: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error('Você precisa estar logado');
      router.push('/login');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/seller/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sellerType: 'PF',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar');
      }

      toast.success('Cadastro enviado com sucesso! Aguarde aprovação.');
      router.push('/vendedor/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-2">Cadastro de Vendedor</h1>
          <p className="text-gray-600 mb-8">Pessoa Física</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informações da Loja */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Informações da Loja</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nome da Loja *
                  </label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="Ex: Loja do João"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Será a URL da sua loja: /loja/{formData.storeName.toLowerCase().replace(/\s+/g, '-')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Descrição da Loja
                  </label>
                  <textarea
                    name="storeDescription"
                    value={formData.storeDescription}
                    onChange={handleChange}
                    rows={4}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="Conte sobre sua loja, produtos que vende, etc..."
                  />
                </div>
              </div>
            </div>

            {/* Dados Pessoais */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Dados Pessoais</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">CPF *</label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    required
                    maxLength={14}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">RG</label>
                  <input
                    type="text"
                    name="rg"
                    value={formData.rg}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="00.000.000-0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Data de Nascimento *</label>
                  <input
                    type="date"
                    name="dataNascimento"
                    value={formData.dataNascimento}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Endereço</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">CEP *</label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    onBlur={buscarCep}
                    required
                    maxLength={9}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="00000-000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Endereço *</label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Número *</label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Complemento</label>
                  <input
                    type="text"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bairro *</label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Cidade *</label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Estado *</label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="">Selecione</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dados Bancários */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Dados Bancários</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Banco *</label>
                  <input
                    type="text"
                    name="banco"
                    value={formData.banco}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Agência *</label>
                  <input
                    type="text"
                    name="agencia"
                    value={formData.agencia}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Conta *</label>
                  <input
                    type="text"
                    name="conta"
                    value={formData.conta}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="00000-0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Conta *</label>
                  <select
                    name="tipoConta"
                    value={formData.tipoConta}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="corrente">Corrente</option>
                    <option value="poupanca">Poupança</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Chave PIX</label>
                  <input
                    type="text"
                    name="chavePix"
                    value={formData.chavePix}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/vendedor/cadastro')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Cadastrando...' : 'Finalizar Cadastro'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
