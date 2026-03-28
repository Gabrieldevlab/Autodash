import { useState } from 'react';
import { useAuth } from './lib/auth-context';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './components/DashboardPage';
import { InventoryPage } from './components/InventoryPage';
import { CustomersPage } from './components/CustomersPage';
import { OrdersPage } from './components/OrdersPage';
import { ProfilePage } from './components/ProfilePage';
import { SupportPage } from './components/SupportPage';
import { AdminPanel } from './components/AdminPanel';
import { Loader2, AlertCircle, Settings } from 'lucide-react';
import { Toaster } from 'sonner';

export default function App() {
  const { user, userType, loading, loginAsEmployee, loginAsAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(userType === 'employee' ? 'orders' : 'dashboard');

  if (!isSupabaseConfigured) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-orange-100">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-orange-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Configuração Necessária</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Para utilizar o Autodash, você precisa configurar as credenciais do Supabase no menu de 
            <strong className="text-slate-900"> Settings (Segredos)</strong>.
          </p>
          <div className="space-y-4 text-left bg-slate-50 p-4 rounded-lg mb-8">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <code className="text-slate-700">VITE_SUPABASE_URL</code>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <code className="text-slate-700">VITE_SUPABASE_ANON_KEY</code>
            </div>
          </div>
          <p className="text-xs text-slate-400 italic">
            Após configurar, a página será atualizada automaticamente.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  if (!userType) {
    return <AuthPage onLoginAsEmployee={loginAsEmployee} onLoginAsAdmin={loginAsAdmin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'finances':
        if (userType === 'employee') return <OrdersPage />;
        return <DashboardPage />;
      case 'inventory':
        return <InventoryPage userType={userType as 'owner' | 'employee'} />;
      case 'customers':
        return <CustomersPage />;
      case 'orders':
        return <OrdersPage />;
      case 'profile':
        if (userType === 'employee') return <OrdersPage />;
        return <ProfilePage />;
      case 'support':
        return <SupportPage />;
      case 'admin':
        if (userType !== 'admin') return <OrdersPage />;
        return <AdminPanel />;
      default:
        return userType === 'employee' ? <OrdersPage /> : <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        userType={userType} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={logout} 
      />
      <main className="flex-1 lg:ml-[260px] transition-all duration-300">
        {renderContent()}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
