import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, useIsAdmin, useMyActivity } from '@/hooks/useLibrary';
import { PageHeader } from '@/components/library/PageState';
import { errorMessage } from '@/data/repository';

const Stat = ({ value, label, to }: { value: number | string; label: string; to: string }) => (
  <Link to={to} className="surface block p-4 text-center hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-canard-profond">
    <span className="block font-display text-3xl font-bold text-brun-cafe-doux">{value}</span>
    <span className="text-sm text-muted-foreground">{label}</span>
  </Link>
);

const PasswordSection = () => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updatePassword(password);
      toast.success('Mot de passe modifié.');
      setPassword('');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="surface mb-8 p-6" aria-labelledby="password-title">
      <h2 id="password-title" className="mb-4 font-display text-lg font-bold text-brun-cafe-doux">Mot de passe</h2>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="profile-password" className="field-label">Nouveau mot de passe (8 caractères minimum)</label>
          <Input id="profile-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" variant="outline" disabled={saving || password.length < 8}>{saving ? 'Enregistrement…' : 'Changer le mot de passe'}</Button>
      </form>
    </section>
  );
};

const ContactsSection = () => {
  const { user, updateContacts } = useAuth();
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp ? `+${user.whatsapp}` : '');
  const [messenger, setMessenger] = useState(user?.messenger ? `m.me/${user.messenger}` : '');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateContacts(whatsapp || null, messenger || null);
      toast.success('Coordonnées enregistrées.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="surface mb-8 p-6" aria-labelledby="contacts-title">
      <h2 id="contacts-title" className="font-display text-lg font-bold text-brun-cafe-doux">Me prévenir sur WhatsApp ou Messenger</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Quand quelqu’un demande un de vos jeux, le site lui propose de vous envoyer un message tout prêt.
        Avec vos coordonnées, la conversation avec vous s’ouvre directement. Visibles uniquement par les membres connectés.
      </p>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-whatsapp" className="field-label">Numéro WhatsApp</label>
          <Input id="profile-whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div>
          <label htmlFor="profile-messenger" className="field-label">Lien Messenger</label>
          <Input id="profile-messenger" placeholder="m.me/prenom.nom" value={messenger} onChange={(e) => setMessenger(e.target.value)} aria-describedby="messenger-help" />
          <p id="messenger-help" className="mt-2 text-xs text-muted-foreground">Collez l’adresse de votre profil Facebook (ex. facebook.com/prenom.nom) ou votre lien m.me.</p>
        </div>
        <div className="sm:col-span-2"><Button type="submit" variant="outline" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
      </form>
    </section>
  );
};

const Profile = () => {
  const { user, signOut, updateProfile, mode } = useAuth();
  const collection = useCollection();
  const admin = useIsAdmin();
  const activity = useMyActivity();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;
  const loans = activity.data?.loans ?? [];
  const requests = activity.data?.requests ?? [];
  const dash = activity.isLoading ? '…' : undefined;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile(name, username || null);
      toast.success('Profil mis à jour.');
      setEditing(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container max-w-4xl">
      <PageHeader eyebrow="Mon profil" title={user.displayName} lead={user.username ? `@${user.username}` : 'Aucun pseudo renseigné'} />

      <section className="surface mb-8 p-6" aria-labelledby="identity">
        <h2 id="identity" className="mb-4 font-display text-lg font-bold text-brun-cafe-doux">Mes informations</h2>
        {editing ? (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="profile-name" className="field-label">Nom affiché</label><Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} /></div>
            <div><label htmlFor="profile-username" className="field-label">Pseudo</label><Input id="profile-username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} /></div>
            <div className="flex gap-3 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button><Button type="button" variant="outline" onClick={() => { setEditing(false); setName(user.displayName); setUsername(user.username ?? ''); }}>Annuler</Button></div>
          </form>
        ) : (
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="font-semibold text-muted-foreground">Nom affiché</dt><dd className="text-brun-cafe-doux">{user.displayName}</dd></div>
            <div><dt className="font-semibold text-muted-foreground">Pseudo</dt><dd className="text-brun-cafe-doux">{user.username ? `@${user.username}` : '—'}</dd></div>
            <div><dt className="font-semibold text-muted-foreground">{mode === 'local' ? 'Compte' : 'Email (privé)'}</dt><dd className="break-all text-brun-cafe-doux">{mode === 'local' ? 'Profil local de ce navigateur' : user.email}</dd></div>
          </dl>
        )}
        {!editing && <Button className="mt-6" variant="outline" onClick={() => setEditing(true)}>Modifier mes informations</Button>}
      </section>

      <ContactsSection />

      {mode === 'supabase' && <PasswordSection />}

      <section aria-labelledby="stats" className="mb-8">
        <h2 id="stats" className="mb-4 font-display text-lg font-bold text-brun-cafe-doux">En résumé</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat to="/my-collection" value={collection.isLoading ? '…' : (collection.data ?? []).length} label="Jeux possédés" />
          <Stat to="/my-loans" value={dash ?? loans.filter((l) => l.status === 'active' && l.ownerId === user.id).length} label="Jeux prêtés" />
          <Stat to="/my-loans" value={dash ?? loans.filter((l) => l.status === 'active' && l.borrowerId === user.id).length} label="Jeux empruntés" />
          <Stat to="/my-loans" value={dash ?? requests.filter((r) => r.status === 'pending' && r.ownerId === user.id).length} label="Demandes à traiter" />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {admin.data && <Button asChild variant="outline"><Link to="/admin">Administration des fiches</Link></Button>}
        <Button variant="outline" onClick={() => void signOut()}>Se déconnecter</Button>
      </div>
    </div>
  );
};

export { Profile };
