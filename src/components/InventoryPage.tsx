import React, { useState, useEffect } from 'react';
import { supabase, type InventoryItem, type Profile } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2, FileText, Package, X, AlertTriangle, Settings } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface InventoryPageProps {
  userType: 'owner' | 'employee';
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ userType }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('5');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [invRes, profRes] = await Promise.all([
      supabase.from('inventory').select('*').order('description'),
      supabase.from('profiles').select('*').single()
    ]);
    
    if (invRes.data) setItems(invRes.data);
    if (profRes.data) {
      setProfile(profRes.data);
      setThreshold(profRes.data.low_stock_threshold?.toString() || '5');
    }
    setLoading(false);
  };

  const handleUpdateThreshold = async () => {
    if (userType !== 'owner') return;
    const { error } = await supabase
      .from('profiles')
      .update({ low_stock_threshold: parseInt(threshold) })
      .eq('id', profile?.id);
    
    if (!error) {
      setIsSettingsOpen(false);
      fetchData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemData = {
      description,
      sale_price: parseFloat(salePrice),
      quantity: parseInt(quantity),
      ...(userType === 'owner' ? { cost_price: parseFloat(costPrice) } : {})
    };

    if (editingItem) {
      await supabase.from('inventory').update(itemData).eq('id', editingItem.id);
    } else {
      await supabase.from('inventory').insert([itemData]);
    }

    setIsModalOpen(false);
    setEditingItem(null);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setDescription('');
    setCostPrice('');
    setSalePrice('');
    setQuantity('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      await supabase.from('inventory').delete().eq('id', id);
      fetchData();
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Fluxo de Estoque', 14, 15);
    
    const tableData = items.map(item => [
      item.description,
      item.quantity,
      formatCurrency(item.sale_price),
      userType === 'owner' ? formatCurrency(item.cost_price) : '***',
      formatCurrency(item.sale_price * item.quantity)
    ]);

    (doc as any).autoTable({
      head: [['Descrição', 'Qtd', 'Venda', 'Custo', 'Total Venda']],
      body: tableData,
      startY: 25,
    });

    if (userType === 'owner') {
      const totalCost = items.reduce((acc, item) => acc + (item.cost_price * item.quantity), 0);
      const totalSale = items.reduce((acc, item) => acc + (item.sale_price * item.quantity), 0);
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text(`Total Gasto (Custo): ${formatCurrency(totalCost)}`, 14, finalY);
      doc.text(`Total Estimado (Venda): ${formatCurrency(totalSale)}`, 14, finalY + 7);
      doc.text(`Lucro Estimado: ${formatCurrency(totalSale - totalCost)}`, 14, finalY + 14);
    }

    doc.save('estoque-autodash.pdf');
  };

  const filteredItems = items.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estoque</h1>
          <p className="text-slate-500">Gerencie as peças e materiais da sua oficina</p>
        </div>
        <div className="flex gap-2">
          {userType === 'owner' && (
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <Settings size={20} />
              Configurar Alerta
            </button>
          )}
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <FileText size={20} />
            Gerar PDF
          </button>
          <button 
            onClick={() => { resetForm(); setEditingItem(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
          >
            <Plus size={20} />
            Novo Item
          </button>
        </div>
      </div>

      {items.some(i => i.quantity <= parseInt(threshold)) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4 text-red-700">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="font-bold">Alerta de Estoque Baixo</p>
            <p className="text-sm">Existem itens com quantidade igual ou inferior a {threshold} unidades.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Quantidade</th>
                <th className="px-6 py-4 font-semibold">Venda</th>
                {userType === 'owner' && <th className="px-6 py-4 font-semibold">Custo</th>}
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className={cn(
                  "hover:bg-slate-50 transition-colors",
                  item.quantity <= parseInt(threshold) && "bg-red-50/50"
                )}>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {item.description}
                      {item.quantity <= parseInt(threshold) && (
                        <AlertTriangle size={14} className="text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-medium",
                      item.quantity <= parseInt(threshold) ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    )}>
                      {item.quantity} unidades
                    </span>
                  </td>
                  <td className="px-6 py-4">{formatCurrency(item.sale_price)}</td>
                  {userType === 'owner' && <td className="px-6 py-4 text-slate-500">{formatCurrency(item.cost_price)}</td>}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setDescription(item.description);
                          setSalePrice(item.sale_price.toString());
                          setCostPrice(item.cost_price?.toString() || '');
                          setQuantity(item.quantity.toString());
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Configurar Alerta</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Limite de Estoque Baixo</label>
                <input 
                  type="number" 
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-2">Itens com quantidade igual ou menor que este valor serão destacados.</p>
              </div>
              <button 
                onClick={handleUpdateThreshold}
                className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
              >
                Salvar Configuração
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qtd</label>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Venda (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>
              </div>
              {userType === 'owner' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Custo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>
              )}
              <button className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200">
                {editingItem ? 'Salvar Alterações' : 'Adicionar ao Estoque'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
