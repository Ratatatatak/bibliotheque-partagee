import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/data/repository';
import { AuthLayout, insertAtSignOnAltGr0 } from '@/components/auth/AuthLayout';

const Register = () => {
  const navigate = useNavigate();
  const { signUp, mode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  if (mode === 'local') return <Navigate to="/login" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const handle = username.trim();
    if (!/^[\p{L}\p{N}_.-]{3,24}$/u.test(handle)) {
      toast.error('Le pseudo doit contenir 3 à 24 lettres, chiffres, points, tirets ou soulignés.');
      return;
    }
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(email.trim(), password, fullName.trim(), handle);
      if (needsConfirmation) {
        toast.success('Inscription enregistrée. Confirmez votre adresse grâce au lien reçu par email, puis connectez-vous.');
        navigate('/login');
      } else {
        toast.success('Bienvenue dans la ludothèque !');
        navigate('/');
      }
    } catch (err) {
      const message = errorMessage(err);
      toast.error(/already registered/i.test(message) ? 'Un compte existe déjà avec cette adresse.'
        : /signups not allowed/i.test(message) ? 'Les inscriptions sont fermées : demandez une invitation à un administrateur du groupe.'
          : /profiles_username_unique|duplicate key/i.test(message) ? 'Ce pseudo est déjà utilisé.'
            : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Inscription" subtitle="Rejoignez la ludothèque du groupe.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="field-label">Pseudo</label>
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={24} required aria-describedby="username-help" />
          <p id="username-help" className="mt-1 text-xs text-muted-foreground">Visible par les membres du groupe.</p>
        </div>
        <div>
          <label htmlFor="fullName" className="field-label">Prénom et nom</label>
          <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <Input id="email" type="email" autoComplete="email" value={email} onKeyDown={insertAtSignOnAltGr0(email, setEmail)} onChange={(e) => setEmail(e.target.value)} required aria-describedby="email-help" />
          <p id="email-help" className="mt-1 text-xs text-muted-foreground">Jamais affiché aux autres membres.</p>
        </div>
        <div>
          <label htmlFor="password" className="field-label">Mot de passe (8 caractères minimum)</label>
          <Input id="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Inscription en cours…' : 'S’inscrire'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà un compte ? <Link to="/login" className="font-semibold text-bleu-canard-profond underline underline-offset-4">Se connecter</Link>
      </p>
    </AuthLayout>
  );
};

export { Register };
