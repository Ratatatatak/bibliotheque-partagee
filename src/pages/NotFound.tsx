import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-6">404</h1>
        <p className="text-2xl text-muted-foreground mb-8">Page non trouvée</p>
        <p className="text-lg text-muted-foreground mb-6">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export { NotFound };