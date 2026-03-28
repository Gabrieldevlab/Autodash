import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User, Shield } from 'lucide-react';

interface AuthPageProps {
  onLoginAsEmployee: (data: any) => void;
  onLoginAsAdmin: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginAsEmployee, onLoginAsAdmin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginType, setLoginType] = useState<'owner' | 'employee' | 'admin'>('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOwnerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
        alert('Cadastro realizado! Verifique seu e-mail.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('name', name)
        .eq('password_hash', password)
        .single();

      if (error || !data) throw new Error('Credenciais inválidas');
      onLoginAsEmployee(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validCode = import.meta.env.VITE_ADMIN_CODE || '040511';
    if (adminCode === validCode) {
      onLoginAsAdmin();
    } else {
      setError('Código de acesso inválido');
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl text-white mb-4 shadow-lg shadow-orange-200">
              <TrendingUp size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Autodash</h1>
            <p className="text-slate-500">Gestão inteligente para sua oficina</p>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            <button 
              onClick={() => setLoginType('owner')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginType === 'owner' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Dono
            </button>
            <button 
              onClick={() => setLoginType('employee')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginType === 'employee' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Funcionário
            </button>
            <button 
              onClick={() => setLoginType('admin')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginType === 'admin' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ADM
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          {loginType === 'owner' && (
            <form onSubmit={handleOwnerAuth} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    required
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="email" 
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="password" 
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  required
                />
              </div>
              <button 
                disabled={loading}
                className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 disabled:opacity-50"
              >
                {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
              </button>

              {isLogin && (
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Ou continue com</span></div>
                </div>
              )}

              {isLogin && (
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 border border-slate-200 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                  Google
                </button>
              )}

              <p className="text-center text-sm text-slate-500 mt-6">
                {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                <button 
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-1 text-orange-600 font-semibold hover:underline"
                >
                  {isLogin ? 'Cadastre-se' : 'Faça login'}
                </button>
              </p>
            </form>
          )}

          {loginType === 'employee' && (
            <form onSubmit={handleEmployeeLogin} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Nome do funcionário"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="password" 
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  required
                />
              </div>
              <button 
                disabled={loading}
                className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Entrar como Funcionário'}
              </button>
            </form>
          )}

          {loginType === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="relative">
                <Shield className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="password" 
                  placeholder="Código de Acesso ADM"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  required
                />
              </div>
              <button 
                className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
              >
                Acessar Painel ADM
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

import { TrendingUp } from 'lucide-react';
