import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Headphones,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SidebarProps {
  userType: 'owner' | 'employee' | 'admin';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ userType, activeTab, setActiveTab, onLogout }) => {
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner'] },
    { id: 'inventory', label: 'Estoque', icon: Package, roles: ['owner', 'employee'] },
    { id: 'customers', label: 'Clientes', icon: Users, roles: ['owner', 'employee'] },
    { id: 'orders', label: 'Ordens de Serviço', icon: ClipboardList, roles: ['owner', 'employee'] },
    { id: 'finances', label: 'Financeiro', icon: TrendingUp, roles: ['owner'] },
    { id: 'profile', label: 'Perfil da Loja', icon: Settings, roles: ['owner'] },
    { id: 'support', label: 'Suporte', icon: Headphones, roles: ['owner'] },
    { id: 'admin', label: 'Painel ADM', icon: ShieldCheck, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userType));

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 260 : 80 }}
        className="h-screen bg-slate-900 text-slate-300 flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 border-r border-slate-800"
      >
        <div className="p-6 flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="text-white" size={20} />
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-xl text-white whitespace-nowrap"
              >
                Autodash
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group",
                activeTab === item.id 
                  ? "bg-orange-500 text-white" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={22} className={cn(activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-white")} />
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors group"
          >
            <LogOut size={22} className="text-slate-400 group-hover:text-red-500" />
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  Sair
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
};
