import React, { useState, useEffect } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import { Shield, User, AlertCircle, MessageSquare, Lock, Unlock, Bell } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
    setLoading(false);
  };

  const toggleBlock = async (profile: Profile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !profile.is_blocked })
      .eq('id', profile.id);
    
    if (!error) fetchProfiles();
  };

  const sendMessage = async () => {
    if (!selectedProfile || !message) return;
    
    await supabase.from('support_messages').insert([{
      from_id: 'admin',
      to_id: selectedProfile.owner_id,
      message: message
    }]);

    setMessage('');
    alert('Notificação enviada!');
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Shield className="text-slate-900" size={28} />
          Painel Administrativo Global
        </h1>
        <p className="text-slate-500">Controle de acessos e comunicações do sistema Autodash</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
            Contas Registradas
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">CNPJ</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <User size={16} className="text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-900">{p.company_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{p.cnpj}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        p.is_blocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      )}>
                        {p.is_blocked ? 'Bloqueado' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedProfile(p)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Bell size={18} />
                        </button>
                        <button 
                          onClick={() => toggleBlock(p)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            p.is_blocked 
                              ? "text-green-500 hover:bg-green-50" 
                              : "text-red-500 hover:bg-red-50"
                          )}
                        >
                          {p.is_blocked ? <Unlock size={18} /> : <Lock size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="text-orange-500" size={20} />
              Notificar Proprietário
            </h3>
            {selectedProfile ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Enviando para:</p>
                  <p className="font-bold text-slate-900">{selectedProfile.company_name}</p>
                </div>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite o aviso de atraso ou suporte..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 h-32 text-sm"
                />
                <button 
                  onClick={sendMessage}
                  className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Enviar Notificação
                </button>
                <button 
                  onClick={() => setSelectedProfile(null)}
                  className="w-full py-2 text-slate-500 text-sm hover:underline"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                <AlertCircle className="mx-auto text-slate-200 mb-2" size={32} />
                <p className="text-sm text-slate-400 px-4">Selecione uma conta na lista para enviar uma mensagem direta.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import { cn } from '../lib/utils';
