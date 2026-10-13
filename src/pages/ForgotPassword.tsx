import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/data/repository';
import { AuthLayout, insertAtSignOnAltGr0 } from '@/components/auth/AuthLayout';

const ForgotPassword = () => {
  const { requestPasswordReset, mode } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (mode === 'local') return <Navigate to="/login" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      const message = errorMessage(e);
      setError(/rate limit/i.test(message) ? 'Trop de demandes rapprochées. Patientez quelques minutes puis réessayez.' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Mot de passe oublié" subtitle="Recevez un lien pour choisir un nouveau mot de passe.">
      {sent ? (
        <div className="space-y-4 text-brun-cafe-doux" role="status">
          <p>Si un compte existe pour <strong>{email}</strong>, un email vient d’être envoyé avec un lien de réinitialisation.</p>
          <p className="text-sm text-muted-foreground">Pensez à regarder dans les courriers indésirables. Le lien n’est valable que peu de temps.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="field-label">Adresse email du compte</label>
            <Input id="email" type="email" autoComplete="email" value={email} onKeyDown={insertAtSignOnAltGr0(email, setEmail)} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <p className="text-sm font-semibold text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Envoi…' : 'Recevoir le lien'}</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold text-bleu-canard-profond underline underline-offset-4">Retour à la connexion</Link>
      </p>
    </AuthLayout>
  );
};

export { ForgotPassword };
