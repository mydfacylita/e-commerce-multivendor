"use client";
import { useState } from "react";

export default function ShippingCalculator() {
  const [cep, setCep] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulação de cálculo de frete
    setTimeout(() => {
      setResult("Frete estimado: R$ 19,90 (15-30 dias úteis)");
      setLoading(false);
    }, 800);
  }

  return (
    <div className="border-t pt-6">
      <h3 className="font-semibold text-lg mb-4">🚚 Calcule o Frete</h3>
      <form className="flex gap-2 items-center" onSubmit={handleSubmit}>
        <input
          type="text"
          name="cep"
          placeholder="Digite seu CEP"
          maxLength={9}
          className="border rounded px-3 py-2 w-40"
          value={cep}
          onChange={e => setCep(e.target.value)}
        />
        <button
          type="submit"
          className="bg-primary-600 text-white px-4 py-2 rounded font-semibold hover:bg-primary-700 transition"
          disabled={loading || !cep}
        >
          {loading ? "Calculando..." : "Calcular"}
        </button>
      </form>
      {result && (
        <div className="mt-2 text-sm text-gray-700">
          <span className="font-bold text-primary-600">{result}</span>
        </div>
      )}
    </div>
  );
}
