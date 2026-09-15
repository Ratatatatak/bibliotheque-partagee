import { Mail, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background/95 backdrop-blur-md border-t border-border">
      <div className="container mx-auto px-4 md:px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="font-heading text-xl mb-4">Bibliothèque Partagée</h3>
            <p className="text-muted-foreground">
              Partagez vos jeux de société avec votre communauté locale.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold mb-2">Liens rapides</h4>
            <a href="/games" className="text-muted-foreground hover:text-primary">
              Bibliothèque de jeux
            </a>
            <a href="/my-collection" className="text-muted-foreground hover:text-primary">
              Ma collection
            </a>
            <a href="/my-loans" className="text-muted-foreground hover:text-primary">
              Mes emprunts
            </a>
            <a href="/profile" className="text-muted-foreground hover:text-primary">
              Profil
            </a>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold mb-2">Contact</h4>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> contact@bibliotheque-partagee.fr
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> 01 23 45 67 89
            </p>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-border">
          <p className="text-center text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Bibliothèque Partagée. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };