import React, { useState, useEffect } from 'react';
import { supabase, type Expense, type ServiceOrder, type InventoryItem, type Profile } from '../lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Plus, FileText, Calendar, X, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const DashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  
  // Expense Form
  const [expDesc, setExpDesc] = useState('');
  const [expValue, setExpValue] = useState('');
  const [expType, setExpType] = useState<'fixed' | 'variable'>('fixed');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [orderRes, expRes, invRes, profRes] = await Promise.all([
      supabase.from('service_orders').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('inventory').select('*'),
      supabase.from('profiles').select('*').single()
    ]);
    
    if (orderRes.data) setOrders(orderRes.data);
    if (expRes.data) setExpenses(expRes.data);
    if (invRes.data) setInventory(invRes.data);
    if (profRes.data) setProfile(profRes.data);
    setLoading(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('expenses').insert([{
      description: expDesc,
      value: parseFloat(expValue),
      type: expType,
      date: new Date().toISOString()
    }]);
    setIsExpenseModalOpen(false);
    setExpDesc('');
    setExpValue('');
    fetchData();
  };

  const generateFinancialReport = () => {
    const doc = new jsPDF();
    doc.text('Relatório Financeiro Autodash', 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);

    const totalRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((acc, o) => acc + o.total_value, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.value, 0);
    const netProfit = totalRevenue - totalExpenses;

    const summaryData = [
      ['Faturamento Bruto (Entregues)', formatCurrency(totalRevenue)],
      ['Despesas Totais', formatCurrency(totalExpenses)],
      ['Lucro Líquido', formatCurrency(netProfit)]
    ];

    (doc as any).autoTable({
      head: [['Métrica', 'Valor']],
      body: summaryData,
      startY: 30,
    });

    const paymentBreakdown = [
      ['Dinheiro', formatCurrency(orders.filter(o => o.status === 'delivered' && o.payment_method === 'money').reduce((acc, o) => acc + o.total_value, 0))],
      ['Cartão de Crédito', formatCurrency(orders.filter(o => o.status === 'delivered' && o.payment_method === 'credit_card').reduce((acc, o) => acc + o.total_value, 0))],
      ['Cartão de Débito', formatCurrency(orders.filter(o => o.status === 'delivered' && o.payment_method === 'debit_card').reduce((acc, o) => acc + o.total_value, 0))],
      ['PIX', formatCurrency(orders.filter(o => o.status === 'delivered' && o.payment_method === 'pix').reduce((acc, o) => acc + o.total_value, 0))],
    ];

    doc.text('Vendas por Método de Pagamento', 14, (doc as any).lastAutoTable.finalY + 10);
    (doc as any).autoTable({
      head: [['Método', 'Total Faturado']],
      body: paymentBreakdown,
      startY: (doc as any).lastAutoTable.finalY + 15,
    });

    doc.text('Detalhamento de Despesas', 14, (doc as any).lastAutoTable.finalY + 10);
    (doc as any).autoTable({
      head: [['Descrição', 'Tipo', 'Valor']],
      body: expenses.map(e => [e.description, e.type === 'fixed' ? 'Fixa' : 'Variável', formatCurrency(e.value)]),
      startY: (doc as any).lastAutoTable.finalY + 15,
    });

    doc.save('relatorio-financeiro.pdf');
  };

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalRevenue = deliveredOrders.reduce((acc, o) => acc + o.total_value, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.value, 0);
  const netProfit = totalRevenue - totalExpenses;

  const paymentMethodsData = [
    { name: 'Dinheiro', value: deliveredOrders.filter(o => o.payment_method === 'money').reduce((acc, o) => acc + o.total_value, 0) },
    { name: 'Cartão Crédito', value: deliveredOrders.filter(o => o.payment_method === 'credit_card').reduce((acc, o) => acc + o.total_value, 0) },
    { name: 'Cartão Débito', value: deliveredOrders.filter(o => o.payment_method === 'debit_card').reduce((acc, o) => acc + o.total_value, 0) },
    { name: 'PIX', value: deliveredOrders.filter(o => o.payment_method === 'pix').reduce((acc, o) => acc + o.total_value, 0) },
  ].filter(item => item.value > 0);

  const chartData = [
    { name: 'Faturamento', value: totalRevenue },
    { name: 'Despesas', value: totalExpenses },
  ];

  const COLORS = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6'];
  const lowStockThreshold = profile?.low_stock_threshold || 5;
  const lowStockItems = inventory.filter(item => item.quantity <= lowStockThreshold);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500">Acompanhe a saúde financeira da sua oficina</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={generateFinancialReport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <FileText size={20} />
            Relatório PDF
          </button>
          <button 
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
          >
            <Plus size={20} />
            Adicionar Despesa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><TrendingUp size={20} /></div>
            <span className="text-sm font-medium text-slate-500">Faturamento Bruto</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><TrendingDown size={20} /></div>
            <span className="text-sm font-medium text-slate-500">Despesas Totais</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><DollarSign size={20} /></div>
            <span className="text-sm font-medium text-slate-500">Lucro Líquido</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(netProfit)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Package size={20} /></div>
            <span className="text-sm font-medium text-slate-500">Ordens Entregues</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{deliveredOrders.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-6">Comparativo Fluxo de Caixa</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm text-slate-600">Faturamento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-600">Despesas</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-6">Métodos de Pagamento (Entregues)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentMethodsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {paymentMethodsData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }}></div>
                <span className="text-xs text-slate-600">{item.name}: {formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Alertas de Estoque</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              {lowStockItems.length} itens críticos
            </span>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{item.description}</p>
                    <p className="text-xs text-red-600">Abaixo do limite ({lowStockThreshold})</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-700">{item.quantity} un</p>
                  <p className="text-xs text-slate-500">Em estoque</p>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Package className="mx-auto mb-2 opacity-20" size={48} />
                <p>Estoque em dia!</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-6">Despesas Recentes</h3>
          <div className="space-y-4">
            {expenses.slice(0, 5).map((exp) => (
              <div key={exp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-900">{exp.description}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{exp.type === 'fixed' ? 'Fixa' : 'Variável'}</p>
                </div>
                <span className="font-bold text-red-600">-{formatCurrency(exp.value)}</span>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                Nenhuma despesa cadastrada.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Nova Despesa</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Aluguel, Energia, Peças..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={expValue}
                  onChange={(e) => setExpValue(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <select 
                  value={expType}
                  onChange={(e) => setExpType(e.target.value as 'fixed' | 'variable')}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="fixed">Fixa</option>
                  <option value="variable">Variável</option>
                </select>
              </div>
              <button className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors">
                Salvar Despesa
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
