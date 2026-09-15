const Creations = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
 Nos créations
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Placeholder cards for creations */}
          <div className="bg-muted rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium mb-4">Création 1</h3>
            <p className="text-muted-foreground">Description de la création</p>
          </div>
          <div className="bg-muted rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium mb-4">Création 2</h3>
            <p className="text-muted-foreground">Description de la création</p>
          </div>
          <div className="bg-muted rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium mb-4">Création 3</h3>
            <p className="text-muted-foreground">Description de la création</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Creations };