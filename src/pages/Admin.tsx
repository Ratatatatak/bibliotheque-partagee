import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Profile = { id: string; full_name: string | null; role: 'user' | 'admin'; created_at: string };

const Admin = () => {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['currentProfile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as never).select('id, full_name, role, created_at').eq('id', user?.id as never).maybeSingle();
      return data as Profile | null;
    },
  });
  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: ['adminProfiles'],
    enabled: profile?.role === 'admin',
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles' as never).select('id, full_name, role, created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });

  if (profileLoading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />;
  return <main className="min-h-screen bg-background"><div className="container mx-auto max-w-5xl px-4 py-8"><h1 className="text-3xl font-bold">Administration</h1><p className="mt-2 text-muted-foreground">Utilisateurs inscrits</p>{isLoading ? <p className="mt-8 text-muted-foreground">Chargement des utilisateurs...</p> : <div className="mt-8 overflow-x-auto rounded-lg border bg-card"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/40"><tr><th className="p-4">Nom</th><th className="p-4">Rôle</th><th className="p-4">Inscription</th></tr></thead><tbody>{profiles.map(item => <tr key={item.id} className="border-b last:border-0"><td className="p-4">{item.full_name || 'Sans pseudo'}</td><td className="p-4">{item.role}</td><td className="p-4">{new Date(item.created_at).toLocaleDateString('fr-FR')}</td></tr>)}</tbody></table></div>}</div></main>;
};

export { Admin };