import { ArrowRight, Library, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { gameCatalog } from '@/data/gameCatalog';

const Hero = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/games?search=${encodeURIComponent(query)}` : '/games');
  };

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute -right-24 top-12 h-72 w-72 rounded-full border-[26px] border-accent/15 sm:h-96 sm:w-96" />
      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
        <div className="animate-rise-in max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
            <Library className="h-4 w-4" />
            Notre ludothèque
          </div>
          <h1 className="max-w-2xl text-5xl font-bold leading-[1.05] text-foreground sm:text-6xl">Le bon jeu, au bon moment.</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">Consultez les jeux du groupe, gérez votre collection et suivez les disponibilités.</p>

          <form onSubmit={submitSearch} className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un jeu..." aria-label="Rechercher un jeu" className="h-12 border-border bg-card pl-11 shadow-sm" /></div>
            <Button type="submit" className="h-12 px-6">Rechercher</Button>
          </form>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild><Link to="/games">Explorer les jeux <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/my-collection">Ma collection</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export { Hero };