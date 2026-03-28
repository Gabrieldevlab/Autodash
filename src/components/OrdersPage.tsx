import React, { useState, useEffect, useRef } from 'react';
import { supabase, type Customer, type ServiceOrder, type Profile, type InventoryItem } from '../lib/supabase';
import { Plus, Search, FileText, UserPlus, Check, X, Signature as SignatureIcon, Package } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export const OrdersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Customer, 2: Details, 3: Signature

  // Customer Form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custModel, setCustModel] = useState('');
  const [custPlate, setCustPlate] = useState('');

  // OS Form
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [problem, setProblem] = useState('');
  const [parts, setParts] = useState<{ description: string; price: number; inventory_id?: string }[]>([]);
  const [newPartDesc, setNewPartDesc] = useState('');
  const [newPartPrice, setNewPartPrice] = useState('');
  const [labor, setLabor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'credit_card' | 'debit_card' | 'pix'>('money');
  const [inventorySearch, setInventorySearch] = useState('');
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [custRes, orderRes, profRes, invRes] = await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('service_orders').select('*, customers(*)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').single(),
      supabase.from('inventory').select('*').gt('quantity', 0)
    ]);
    
    if (custRes.data) setCustomers(custRes.data);
    if (orderRes.data) setOrders(orderRes.data);
    if (profRes.data) setProfile(profRes.data);
    if (invRes.data) setInventory(invRes.data);
    setLoading(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('customers').insert([{
      name: custName,
      phone: custPhone,
      vehicle_model: custModel,
      plate: custPlate
    }]).select().single();

    if (data) {
      setCustomers([...customers, data]);
      setIsCustomerModalOpen(false);
      resetCustomerForm();
    }
  };

  const resetCustomerForm = () => {
    setCustName('');
    setCustPhone('');
    setCustModel('');
    setCustPlate('');
  };

  const addPart = () => {
    if (newPartDesc && newPartPrice) {
      setParts([...parts, { description: newPartDesc, price: parseFloat(newPartPrice) }]);
      setNewPartDesc('');
      setNewPartPrice('');
    }
  };

  const addPartFromInventory = (item: InventoryItem) => {
    setParts([...parts, { 
      description: item.description, 
      price: item.sale_price,
      inventory_id: item.id 
    }]);
    setInventorySearch('');
  };

  const handleFinishOS = async () => {
    if (!selectedCustomer || !sigCanvas.current) return;

    const signatureData = sigCanvas.current.toDataURL();
    const totalParts = parts.reduce((acc, p) => acc + p.price, 0);
    const totalValue = totalParts + parseFloat(labor || '0');

    // 1. Create the OS
    const { data, error } = await supabase.from('service_orders').insert([{
      customer_id: selectedCustomer.id,
      problem_description: problem,
      parts_used: parts,
      labor_value: parseFloat(labor || '0'),
      total_value: totalValue,
      signature_data: signatureData,
      status: 'completed',
      payment_method: paymentMethod
    }]).select().single();

    if (data) {
      generateOSPDF({ ...data, customers: selectedCustomer });
      setIsModalOpen(false);
      resetOSForm();
      fetchData();
    }
  };

  const handleDeliverOS = async (order: ServiceOrder) => {
    if (confirm('Deseja marcar esta OS como ENTREGUE? Isso dará baixa no estoque e registrará a entrada no financeiro.')) {
      // 1. Update OS status
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ status: 'delivered' })
        .eq('id', order.id);

      if (updateError) return;

      // 2. Deduct stock
      for (const part of order.parts_used) {
        if (part.inventory_id) {
          const invItem = inventory.find(i => i.id === part.inventory_id);
          if (invItem) {
            await supabase
              .from('inventory')
              .update({ quantity: invItem.quantity - 1 })
              .eq('id', invItem.id);
          }
        }
      }

      // 3. The DashboardPage already calculates revenue based on orders, 
      // but we could also add a note or just let the status filter handle it.
      
      toast.success('OS Entregue!', {
        description: 'Baixa no estoque e entrada no caixa processadas com sucesso.',
      });
      
      fetchData();
    }
  };

  const resetOSForm = () => {
    setSelectedCustomer(null);
    setProblem('');
    setParts([]);
    setLabor('');
    setStep(1);
  };

  const generateOSPDF = (order: any) => {
    const doc = new jsPDF();
    const p = profile;

    // Header
    doc.setFontSize(20);
    doc.text(p?.company_name || 'Autodash Oficina', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`CNPJ: ${p?.cnpj || '00.000.000/0001-00'} | Contato: ${p?.phone || '(00) 00000-0000'}`, 105, 28, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    // Customer Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${order.customers.name}`, 20, 52);
    doc.text(`Telefone: ${order.customers.phone}`, 20, 59);
    doc.text(`Veículo: ${order.customers.vehicle_model} | Placa: ${order.customers.plate}`, 20, 66);

    // Service Info
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIÇÃO DO SERVIÇO', 20, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(order.problem_description, 20, 87, { maxWidth: 170 });

    // Values
    let currentY = 110;
    doc.setFont('helvetica', 'bold');
    doc.text('VALORES', 20, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 7;
    doc.text(`Mão de Obra: ${formatCurrency(order.labor_value)}`, 20, currentY);
    currentY += 7;
    order.parts_used.forEach((part: any) => {
      doc.text(`${part.description}: ${formatCurrency(part.price)}`, 20, currentY);
      currentY += 7;
    });
    
    doc.setLineWidth(0.2);
    doc.line(20, currentY, 190, currentY);
    currentY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(order.total_value)}`, 20, currentY);

    // Signature
    if (order.signature_data) {
      doc.addImage(order.signature_data, 'PNG', 75, currentY + 20, 60, 30);
      doc.line(70, currentY + 50, 140, currentY + 50);
      doc.setFontSize(8);
      doc.text('Assinatura do Cliente', 105, currentY + 55, { align: 'center' });
    }

    doc.save(`OS-${order.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ordens de Serviço</h1>
          <p className="text-slate-500">Gerencie os atendimentos e gere comprovantes</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <UserPlus size={20} />
            Cadastrar Cliente
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
          >
            <Plus size={20} />
            Nova OS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">OS #{order.id.slice(0, 8)}</span>
              <div className="flex flex-col items-end gap-1">
                <span className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                  order.status === 'delivered' ? "bg-blue-100 text-blue-700" :
                  order.status === 'completed' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                )}>
                  {order.status === 'delivered' ? 'Entregue' : 
                   order.status === 'completed' ? 'Concluída' : 'Em Aberto'}
                </span>
                {order.payment_method && (
                  <span className="text-[10px] font-medium text-slate-400 uppercase">
                    {order.payment_method === 'money' ? 'Dinheiro' :
                     order.payment_method === 'credit_card' ? 'Cartão Crédito' :
                     order.payment_method === 'debit_card' ? 'Cartão Débito' : 'PIX'}
                  </span>
                )}
              </div>
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">{(order as any).customers?.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{(order as any).customers?.vehicle_model} • {(order as any).customers?.plate}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex flex-col">
                <span className="font-bold text-orange-600">{formatCurrency(order.total_value)}</span>
              </div>
              <div className="flex gap-2">
                {order.status === 'completed' && (
                  <button 
                    onClick={() => handleDeliverOS(order)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-all"
                  >
                    <Check size={14} />
                    Entregar
                  </button>
                )}
                <button 
                  onClick={() => generateOSPDF(order)}
                  className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                >
                  <FileText size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Novo Cliente</h2>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <input 
                placeholder="Nome do Cliente"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
              <input 
                placeholder="Telefone"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="Modelo do Veículo"
                  value={custModel}
                  onChange={(e) => setCustModel(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
                <input 
                  placeholder="Placa"
                  value={custPlate}
                  onChange={(e) => setCustPlate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <button className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors">
                Salvar Cliente
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* OS Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Nova Ordem de Serviço</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Selecione um cliente para iniciar:</p>
                <div className="space-y-2">
                  {customers.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setStep(2); }}
                      className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.vehicle_model} • {c.plate}</p>
                      </div>
                      <Plus size={20} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Cliente Selecionado</p>
                  <p className="font-bold text-slate-900">{selectedCustomer?.name}</p>
                  <p className="text-sm text-slate-500">{selectedCustomer?.vehicle_model} • {selectedCustomer?.plate}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Problema</label>
                    <textarea 
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 h-24"
                      placeholder="Descreva o que precisa ser feito..."
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mão de Obra (R$)</label>
                        <input 
                          type="number"
                          value={labor}
                          onChange={(e) => setLabor(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pagamento</label>
                        <select 
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="money">Dinheiro</option>
                          <option value="credit_card">Cartão de Crédito</option>
                          <option value="debit_card">Cartão de Débito</option>
                          <option value="pix">PIX</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Adicionar Peças</label>
                      
                      {/* Inventory Search */}
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input 
                          type="text"
                          placeholder="Buscar no estoque..."
                          value={inventorySearch}
                          onChange={(e) => setInventorySearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        {inventorySearch && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-xl z-10 max-h-48 overflow-y-auto">
                            {inventory
                              .filter(i => i.description.toLowerCase().includes(inventorySearch.toLowerCase()))
                              .map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => addPartFromInventory(item)}
                                  className="w-full text-left px-4 py-3 hover:bg-orange-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                                >
                                  <div>
                                    <p className="font-bold text-slate-900">{item.description}</p>
                                    <p className="text-xs text-slate-500">{item.quantity} em estoque • {formatCurrency(item.sale_price)}</p>
                                  </div>
                                  <Plus size={18} className="text-orange-500" />
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input 
                          placeholder="Peça manual"
                          value={newPartDesc}
                          onChange={(e) => setNewPartDesc(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none"
                        />
                        <input 
                          placeholder="R$"
                          type="number"
                          value={newPartPrice}
                          onChange={(e) => setNewPartPrice(e.target.value)}
                          className="w-20 px-3 py-2 border border-slate-200 rounded-xl outline-none"
                        />
                        <button 
                          onClick={addPart}
                          className="p-2 bg-slate-900 text-white rounded-xl"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {parts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase">Peças Adicionadas</p>
                      {parts.map((p, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-sm">
                          <span>{p.description}</span>
                          <span className="font-bold">{formatCurrency(p.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setStep(3)}
                  className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
                >
                  Próximo: Assinatura
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <SignatureIcon size={40} className="mx-auto text-orange-500 mb-2" />
                  <h3 className="text-lg font-bold text-slate-900">Assinatura do Cliente</h3>
                  <p className="text-sm text-slate-500">O cliente deve assinar no campo abaixo</p>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 overflow-hidden">
                  <SignatureCanvas 
                    ref={sigCanvas}
                    penColor='black'
                    canvasProps={{ className: 'w-full h-48 cursor-crosshair' }}
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => sigCanvas.current?.clear()}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50"
                  >
                    Limpar
                  </button>
                  <button 
                    onClick={handleFinishOS}
                    className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    Finalizar e Gerar PDF
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
