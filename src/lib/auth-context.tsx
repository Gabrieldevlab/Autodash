import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'owner' | 'employee' | 'admin' | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setUserType('owner');
      }
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setUserType('owner');
      } else if (!employeeData && userType !== 'admin') {
        setUserType(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [employeeData, userType]);

  const loginAsEmployee = (data: any) => {
    setEmployeeData(data);
    setUserType('employee');
  };

  const loginAsAdmin = () => {
    setUserType('admin');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setEmployeeData(null);
    setUserType(null);
  };

  return {
    user,
    userType,
    employeeData,
    loading,
    loginAsEmployee,
    loginAsAdmin,
    logout
  };
}
