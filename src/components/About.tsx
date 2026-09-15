import { MapPin, Users, Heart } from "lucide-react";

const About = () => {
  return (
    <section id="about" className="py-16 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-8">
            À propos de Bibliothèque Partagée
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Bibliothèque Partagée est une plateforme communautaire dédiée au partage de jeux de société.
            La plateforme permet de référencer les collections des membres et de consulter les jeux disponibles
            dans le groupe.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center py-8 px-6 bg-background/50 rounded-lg">
            <MapPin className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Communauté locale</h3>
            <p className="text-center text-muted-foreground">
              Trouvez les membres du groupe et consultez leurs jeux disponibles.
            </p>
          </div>
          <div className="flex flex-col items-center py-8 px-6 bg-background/50 rounded-lg">
            <Users className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Partage entre membres</h3>
            <p className="text-center text-muted-foreground">
              Consultez les jeux ajoutés par les autres membres du groupe.
            </p>
          </div>
          <div className="flex flex-col items-center py-8 px-6 bg-background/50 rounded-lg">
            <Heart className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Ludothèque enrichie</h3>
            <p className="text-center text-muted-foreground">
              Accédez à davantage de jeux que ceux de votre collection personnelle.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export { About };