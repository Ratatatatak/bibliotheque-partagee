import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== '0' || !e.ctrlKey || !e.altKey) return;
    e.preventDefault();
    const input = e.currentTarget;
    const start = input.selectionStart ?? email.length;
    const end = input.selectionEnd ?? start;
    const nextEmail = `${email.slice(0, start)}@${email.slice(end)}`;
    setEmail(nextEmail);
    requestAnimationFrame(() => input.setSelectionRange(start + 1, start + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, fullName, username.trim());

      toast.success('Inscription réussie. Vérifiez votre email pour confirmer votre compte.');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Inscription</h1>
          <p className="text-muted-foreground">
            Rejoignez la communauté Bibliothèque Partagée
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username" className="mb-2 text-sm font-medium text-foreground">
              Pseudo
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Votre pseudo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={24}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Il sera visible par les membres du groupe.</p>
          </div>
          <div>
            <Label htmlFor="fullName" className="mb-2 text-sm font-medium text-foreground">
              Nom complet
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Votre nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email" className="mb-2 text-sm font-medium text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="exemple@domain.com"
              value={email}
              onKeyDown={handleEmailKeyDown}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-2 text-sm font-medium text-foreground">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            variant="default"
            width="full"
            disabled={loading}
          >
            {loading ? 'Inscription en cours...' : 'S\'inscrire'}
          </Button>
        </form>
        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Déjà un compte ?
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/login')}
          >
            Se connecter
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper component for label
const Label = ({ htmlFor, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label htmlFor={htmlFor} {...props} />
);

export { Register };