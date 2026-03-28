import React, { useState, useEffect } from 'react';
import { supabase, type Profile, type Employee } from '../lib/supabase';
import { User, Building2, Phone, FileText, Camera, Plus, Trash2, Lock } from 'lucide-react';
import { motion } from 'motion/react';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile Form
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Employee Form
  const [empName, setEmpName] = useState('');
  const [empPass, setEmpPass] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profRes, empRes] = await Promise.all([
      supabase.from('profiles').select('*').single(),
      supabase.from('employees').select('*')
    ]);
    
    if (profRes.data) {
      setProfile(profRes.data);
      setCompanyName(profRes.data.company_name);
      setCnpj(profRes.data.cnpj);
      setPhone(profRes.data.phone);
      setImageUrl(profRes.data.image_url || '');
    }
    if (empRes.data) setEmployees(empRes.data);
    setLoading(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').upsert({
      id: profile?.id,
      company_name: companyName,
      cnpj: cnpj,
      phone: phone,
      image_url: imageUrl
    });
    if (!error) alert('Perfil atualizado!');
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employees.length >= 5) {
      alert('Limite de 5 funcionários atingido.');
      return;
    }

    const { error } = await supabase.from('employees').insert([{
      name: empName,
      password_hash: empPass
    }]);

    if (!error) {
      setEmpName('');
      setEmpPass('');
      fetchData();
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Excluir este funcionário?')) {
      await supabase.from('employees').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Configurações da Oficina</h1>
        <p className="text-slate-500">Gerencie os dados da sua empresa e acessos da equipe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Building2 className="text-orange-500" size={20} />
              Dados da Empresa
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 flex items-center justify-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="text-slate-400" size={32} />
                    )}
                  </div>
                  <button type="button" className="absolute -bottom-2 -right-2 p-2 bg-orange-500 text-white rounded-lg shadow-lg hover:bg-orange-600 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">URL da Logo</label>
                  <input 
                    type="text" 
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                  <input 
                    type="text" 
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone de Contato</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <button className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200">
                Salvar Alterações
              </button>
            </form>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <User className="text-orange-500" size={20} />
              Funcionários ({employees.length}/5)
            </h2>
            
            <form onSubmit={handleCreateEmployee} className="space-y-4 mb-6">
              <input 
                placeholder="Nome de usuário"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none text-sm"
                required
              />
              <input 
                type="password"
                placeholder="Senha simples"
                value={empPass}
                onChange={(e) => setEmpPass(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none text-sm"
                required
              />
              <button className="w-full py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
                Criar Acesso
              </button>
            </form>

            <div className="space-y-2">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                      <Lock size={14} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{emp.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
