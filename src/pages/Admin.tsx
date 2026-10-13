import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ErrorState, LoadingState, PageHeader } from '@/components/library/PageState';
import { formatDate } from '@/domain/dates';

type Profile = { id: string; full_name: string | null; username: string | null; role: 'user' | 'admin'; created_at: string };

/**
 * Page d'administration (lecture seule). L'accès réel est contrôlé côté base par
 * la fonction public.is_admin() et les règles RLS ; cette page ne fait qu'afficher.
 */
const Admin = () => {
  const { user, mode } = useAuth();
  const isAdmin = useQuery({
    queryKey: ['isAdmin', user?.id],
    enabled: mode === 'supabase' && Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('is_admin');
      if (error) throw error;
      return data === true;
    },
  });
  const profiles = useQuery({
    queryKey: ['adminProfiles'],
    enabled: isAdmin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase!.from('profiles').select('id, full_name, username, role, created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  if (mode === 'local') return <Navigate to="/" replace />;
  if (isAdmin.isLoading) return <LoadingState />;
  if (isAdmin.isError) return <div className="page-container"><ErrorState error={isAdmin.error} /></div>;
  if (!isAdmin.data) return <Navigate to="/" replace />;

  return (
    <div className="page-container">
      <PageHeader eyebrow="Administration" title="Membres inscrits" />
      {profiles.isLoading ? <LoadingState /> : profiles.isError ? <ErrorState error={profiles.error} /> : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm text-brun-cafe-doux">
            <thead className="border-b border-gris-pierre-chaude bg-gris-perle/60"><tr><th scope="col" className="p-4">Nom</th><th scope="col" className="p-4">Pseudo</th><th scope="col" className="p-4">Rôle</th><th scope="col" className="p-4">Inscription</th></tr></thead>
            <tbody>{(profiles.data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-gris-pierre-chaude last:border-0"><td className="p-4">{p.full_name || '—'}</td><td className="p-4">{p.username ? `@${p.username}` : '—'}</td><td className="p-4">{p.role === 'admin' ? 'Administrateur' : 'Membre'}</td><td className="p-4">{formatDate(p.created_at)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export { Admin };
