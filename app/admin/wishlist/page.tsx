"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiHeart, FiMessageCircle, FiTrash2, FiMaximize2, FiExternalLink } from "react-icons/fi";
import { toast } from "react-hot-toast";

interface WishlistAdminItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  product: {
    id: string;
    name: string;
    price: number;
    images: string; // JSON
  };
}

export default function AdminWishlistPage() {
  const [items, setItems] = useState<WishlistAdminItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/admin/wishlist");
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.ok ? await res.json() : [];
      setItems(data);
    } catch (error) {
      toast.error("Erro ao carregar listas de desejos");
    } finally {
      setLoading(false);
    }
  };

  const notifyUser = (phone: string, productName: string) => {
    // Alerta via WhatsApp (Placeholder para automação futura)
    const message = encodeURIComponent(`Olá! Notamos que você tem o item "${productName}" em sua lista de desejos. Temos uma oferta especial para você hoje!`);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando listas de desejos...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiHeart className="text-red-500" /> Listas de Desejos
          </h1>
          <p className="text-gray-500">Acompanhe o que seus clientes estão salvando.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const images = JSON.parse(item.product.images || "[]");
          const firstImage = images[0] || "/placeholder.png";

          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 flex gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                  <Image
                    src={firstImage}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate" title={item.product.name}>
                    {item.product.name}
                  </h3>
                  <p className="text-primary-600 font-bold mb-1">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.product.price)}
                  </p>
                  <p className="text-xs text-gray-400">Salvo em {new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 relative overflow-hidden">
                    {item.user.image ? (
                      <Image src={item.user.image} alt={item.user.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {item.user.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{item.user.email}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                        toast.success("Em breve: Alerta automático via E-mail!", { icon: '📧' });
                    }}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <FiMaximize2 className="text-xs" /> Alerta E-mail
                  </button>
                  <button 
                    onClick={() => {
                        toast.success("Abrindo WhatsApp...");
                        window.open(`https://wa.me/?text=Desejo%20notificar%20sobre%20o%20produto%20${item.product.name}`, "_blank");
                    }}
                    className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 flex items-center justify-center gap-2"
                  >
                    <FiMessageCircle className="text-xs" /> WhatsApp
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-200">
          <FiHeart className="mx-auto text-4xl text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum item salvo ainda</h3>
          <p className="text-gray-500">As listas de desejos dos clientes aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
}
