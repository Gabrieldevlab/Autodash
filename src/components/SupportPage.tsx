import React, { useState, useEffect } from 'react';
import { supabase, type SupportMessage } from '../lib/supabase';
import { Headphones, Send, User, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

export const SupportPage: React.FC = () => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel('support_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage) return;

    await supabase.from('support_messages').insert([{
      from_id: 'owner', // In a real app, this would be the user's ID
      to_id: 'admin',
      message: newMessage
    }]);

    setNewMessage('');
  };

  return (
    <div className="p-6 h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Headphones className="text-orange-500" size={28} />
          Suporte Técnico
        </h1>
        <p className="text-slate-500">Converse diretamente com os administradores do Autodash</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.from_id === 'admin' ? "self-start" : "self-end items-end"
              )}
            >
              <div className={cn(
                "p-4 rounded-2xl text-sm shadow-sm",
                msg.from_id === 'admin' 
                  ? "bg-slate-100 text-slate-800 rounded-tl-none" 
                  : "bg-orange-500 text-white rounded-tr-none"
              )}>
                <div className="flex items-center gap-2 mb-1 opacity-70">
                  {msg.from_id === 'admin' ? <Shield size={12} /> : <User size={12} />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {msg.from_id === 'admin' ? 'Administrador' : 'Você'}
                  </span>
                </div>
                {msg.message}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-2">
                {format(new Date(msg.created_at), 'HH:mm')}
              </span>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p>Inicie uma conversa com nosso suporte.</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button className="p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200">
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

import { cn } from '../lib/utils';
import { MessageSquare } from 'lucide-react';
