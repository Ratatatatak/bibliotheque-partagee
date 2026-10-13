import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/library/PageState';

const NotFound = () => (
  <div className="page-container">
    <EmptyState icon={<Search className="h-6 w-6" />} title="Page introuvable" action={<Button asChild><Link to="/">Retour à l’accueil</Link></Button>}>
      La page demandée n’existe pas ou a été déplacée.
    </EmptyState>
  </div>
);

export { NotFound };
