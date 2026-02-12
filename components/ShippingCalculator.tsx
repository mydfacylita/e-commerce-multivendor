"use client";
import { useState, useEffect } from "react";
import { FiTruck, FiCheck, FiAlertCircle } from "react-icons/fi";

interface ShippingOption {
  name: string;
  price: number;
  days: string;
  icon?: string;
  isFree?: boolean;
}

interface ShippingCalculatorProps {
  onShippingCalculated?: (result: ShippingOption[] | null) => void;
  compact?: boolean;
  productId?: string;
  cartValue?: number;
}

export default function ShippingCalculator({ 
  onShippingCalculated, 
  compact = false,
  productId,
  cartValue = 0
}: ShippingCalculatorProps) {
  const [cep, setCep] = useState("");
  const [result, setResult] = useState<ShippingOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedCep, setSavedCep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  // Carregar CEP salvo do localStorage
  useEffect(() => {
    const storedCep = localStorage.getItem("userCep");
    if (storedCep) {
      setSavedCep(storedCep);
      setCep(storedCep);
      // Auto-calcular se tem CEP salvo
      calculateShipping(storedCep);
    }
  }, []);

  async function calculateShipping(cepToUse: string) {
    const cleanCep = cepToUse.replace(/\D/g, '');
    if (!cleanCep || cleanCep.length < 8) return;
    
    setLoading(true);
    setError(null);
    setPromoMessage(null);
    
    try {
      // Chamar API de cotação de frete
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        },
        body: JSON.stringify({
          cep: cleanCep,
          cartValue: cartValue,
          products: productId ? [{ productId, quantity: 1 }] : []
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Erro ao calcular frete');
        setResult(null);
        return;
      }

      // Construir opções de frete
      const options: ShippingOption[] = [];
      
      // PRIORIDADE 1: Usar shippingOptions se disponível (Correios, MelhorEnvio, etc.)
      if (data.shippingOptions && Array.isArray(data.shippingOptions) && data.shippingOptions.length > 0) {
        data.shippingOptions.forEach((opt: any) => {
          options.push({
            name: opt.name || opt.service || 'Envio',
            price: opt.price || 0,
            days: typeof opt.deliveryDays === 'string' ? opt.deliveryDays : `${opt.deliveryDays || 7} dias úteis`,
            icon: opt.name?.includes('SEDEX') ? "🚀" : opt.name?.includes('PAC') ? "📦" : "🚚",
            isFree: opt.price === 0
          });
        });
      }
      // PRIORIDADE 2: Opções de frete internacional (AliExpress)
      else if (data.allOptions && Array.isArray(data.allOptions)) {
        data.allOptions.forEach((opt: any) => {
          options.push({
            name: opt.name || 'Logística MydShop Express',
            price: opt.price || 0,
            days: opt.days || '15-30 dias',
            icon: opt.isInternational ? "🚚" : "📦",
            isFree: opt.isFree
          });
        });
      } else if (data.isInternational) {
        // Frete internacional único
        options.push({
          name: data.shippingService || 'Logística MydShop Express',
          price: data.shippingCost || 0,
          days: data.deliveryDays || '15-30 dias',
          icon: "🚚",
          isFree: data.isFree
        });
      } else if (data.isFree || data.shippingCost === 0) {
        options.push({
          name: data.shippingService || 'Frete Grátis',
          price: 0,
          days: `${data.deliveryDays || 7}`,
          icon: "🎉",
          isFree: true
        });
      } else {
        // Opção principal (fallback)
        options.push({
          name: data.shippingService || 'Entrega Padrão',
          price: data.shippingCost || 0,
          days: `${data.deliveryDays || 7}-${(data.deliveryDays || 7) + 3}`,
          icon: "📦"
        });
      }

      // Mensagem de promoção (falta X para frete grátis)
      if (data.promoMessage) {
        setPromoMessage(data.promoMessage);
      }

      setResult(options);
      
      // Salvar CEP no localStorage
      localStorage.setItem("userCep", cleanCep);
      setSavedCep(cleanCep);
      
      if (onShippingCalculated) {
        onShippingCalculated(options);
      }
    } catch (err) {
      console.error('Erro ao calcular frete:', err);
      setError('Erro ao calcular frete. Tente novamente.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    calculateShipping(cep);
  }

  // Formatar CEP
  function formatCep(value: string) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  }

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
  };

  if (compact && result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiCheck className="text-green-600" />
            <span className="text-sm text-green-800">
              Entrega para <strong>{savedCep?.replace(/(\d{5})(\d{3})/, '$1-$2')}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setResult(null);
              setSavedCep(null);
              localStorage.removeItem("userCep");
            }}
            className="text-xs text-primary-600 hover:underline"
          >
            Alterar
          </button>
        </div>
        <div className="mt-2 space-y-1">
          {result.map((option, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>{option.icon} {option.name}</span>
              <span className="font-semibold">
                {option.isFree ? (
                  <span className="text-green-600">Grátis</span>
                ) : (
                  <>R$ {option.price.toFixed(2)}</>
                )}
                <span className="text-gray-500 font-normal ml-1">({option.days} dias)</span>
              </span>
            </div>
          ))}
        </div>
        {promoMessage && (
          <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
            <FiAlertCircle />
            {promoMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <FiTruck className="text-primary-600" />
        Calcule o Frete
      </h3>
      
      {savedCep && result ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Entrega para CEP: <strong>{savedCep.replace(/(\d{5})(\d{3})/, '$1-$2')}</strong>
            </span>
            <button
              onClick={() => {
                setResult(null);
                setSavedCep(null);
                setCep("");
                localStorage.removeItem("userCep");
              }}
              className="text-sm text-primary-600 hover:underline"
            >
              Alterar CEP
            </button>
          </div>
          <div className="space-y-2">
            {result.map((option, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{option.icon}</span>
                  <div>
                    <p className="font-semibold">{option.name}</p>
                    <p className="text-xs text-gray-500">{option.days} dias úteis</p>
                  </div>
                </div>
                {option.isFree ? (
                  <span className="font-bold text-green-600">Grátis</span>
                ) : (
                  <span className="font-bold text-primary-600">R$ {option.price.toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
          {promoMessage && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 flex items-center gap-2">
              <FiAlertCircle />
              {promoMessage}
            </div>
          )}
        </div>
      ) : (
        <>
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <input
              type="text"
              name="cep"
              placeholder="Digite seu CEP"
              maxLength={9}
              className="border rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={cep}
              onChange={handleCepChange}
            />
            <button
              type="submit"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition disabled:bg-gray-400"
              disabled={loading || cep.replace(/\D/g, '').length < 8}
            >
              {loading ? "..." : "Calcular"}
            </button>
          </form>
          {error && (
            <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <FiAlertCircle />
              {error}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            <a 
              href="https://buscacepinter.correios.com.br/app/endereco/index.php" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Não sabe seu CEP?
            </a>
          </p>
        </>
      )}
    </div>
  );
}
