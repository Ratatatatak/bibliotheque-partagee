import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/data/repository';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoadingState } from '@/components/library/PageState';

/**
 * Page ouverte depuis le lien reçu par email. Supabase connecte temporairement
 * la personne grâce au lien ; elle choisit alors son nouveau mot de passe.
 */
const ResetPassword = () => {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingState />;

  if (!user) {
    return (
      <AuthLayout title="Lien expiré ou invalide" subtitle="Ce lien de réinitialisation ne fonctionne plus.">
        <p className="text-brun-cafe-doux">Demandez un nouveau lien : il n’est valable que peu de temps et une seule fois.</p>
        <Button asChild className="mt-6 w-full"><Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link></Button>
      </AuthLayout>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) return setError('Les deux mots de passe ne sont pas identiques.');
    setSaving(true);
    setError(null);
    try {
      await updatePassword(password);
      toast.success('Mot de passe enregistré. Vous êtes connecté.');
      navigate('/', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle={`Compte : ${user.email ?? user.displayName}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="field-label">Nouveau mot de passe (8 caractères minimum)</label>
          <Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="confirm-password" className="field-label">Confirmer le mot de passe</label>
          <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <p className="text-sm font-semibold text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</Button>
      </form>
    </AuthLayout>
  );
};

export { ResetPassword };
