import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { readLocalState } from '@/data/localStore';
import { errorMessage } from '@/data/repository';
import type { Member } from '@/domain/types';
import { AuthLayout, insertAtSignOnAltGr0 } from '@/components/auth/AuthLayout';

const LocalLogin = ({ onDone }: { onDone: () => void }) => {
  const { localSignIn, localCreateMember } = useAuth();
  const [members] = useState<Member[]>(() => readLocalState().members);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const create = (event: FormEvent) => {
    event.preventDefault();
    try {
      localCreateMember(name, username.trim() || null);
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-8">
      <p className="rounded-lg border border-warning-doux bg-warning-doux/15 p-4 text-sm text-brun-cafe-doux">
        <strong>Mode local de démonstration.</strong> Aucune base partagée n’est configurée : les profils et les données
        restent dans ce navigateur. Vous pouvez créer plusieurs profils pour essayer un prêt entre deux membres.
      </p>
      {members.length > 0 && (
        <section aria-labelledby="local-profiles">
          <h2 id="local-profiles" className="mb-3 text-sm font-bold text-brun-cafe-doux">Continuer avec un profil existant</h2>
          <ul className="space-y-2">
            {members.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => { localSignIn(member.id); onDone(); }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-gris-pierre-chaude bg-creme-de-lait px-4 text-left font-semibold text-brun-cafe-doux hover:border-terre-cuite-chaleureuse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse"
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                  {member.displayName}{member.username && <span className="text-sm font-normal text-muted-foreground">@{member.username}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <form onSubmit={create} className="space-y-4" aria-labelledby="local-create">
        <h2 id="local-create" className="text-sm font-bold text-brun-cafe-doux">Créer un profil local</h2>
        <div>
          <label htmlFor="local-name" className="field-label">Prénom ou nom</label>
          <Input id="local-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} autoComplete="given-name" />
        </div>
        <div>
          <label htmlFor="local-username" className="field-label">Pseudo (facultatif)</label>
          <Input id="local-username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} />
        </div>
        <Button type="submit" className="w-full">Créer et entrer</Button>
      </form>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, mode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: string } | null)?.from || '/';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      toast.success('Connexion réussie');
    } catch (err) {
      const message = errorMessage(err);
      toast.error(/invalid login credentials/i.test(message) ? 'Email ou mot de passe incorrect.'
        : /email not confirmed/i.test(message) ? 'Votre adresse email n’est pas encore confirmée : ouvrez le lien reçu par email.'
          : message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'local') {
    return (
      <AuthLayout title="Bienvenue" subtitle="Choisissez qui vous êtes pour entrer dans la ludothèque.">
        <LocalLogin onDone={() => navigate(from, { replace: true })} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Connexion" subtitle="La ludothèque est réservée aux membres du groupe.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <Input id="email" type="email" autoComplete="email" value={email} onKeyDown={insertAtSignOnAltGr0(email, setEmail)} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Mot de passe</label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Connexion en cours…' : 'Se connecter'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ? <Link to="/register" className="font-semibold text-bleu-canard-profond underline underline-offset-4">S’inscrire</Link>
      </p>
    </AuthLayout>
  );
};

export { Login };
