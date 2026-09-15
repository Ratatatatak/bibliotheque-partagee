import { Button } from "@/components/ui/button";

const Contact = () => {
  return (
    <section id="contact" className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Contact
        </h2>
        <div className="max-w-2xl mx-auto">
          <form className="space-y-6">
            <div>
              <label htmlFor="name" className="block mb-2 font-medium text-foreground">
                Nom
              </label>
              <input
                type="text"
                id="name"
                required
                className="w-full px-4 py-2 border border-input bg-background rounded focus:ring-2 focus:ring-primary focus:ring-offset-0"
              />
            </div>
            <div>
              <label htmlFor="email" className="block mb-2 font-medium text-foreground">
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                className="w-full px-4 py-2 border border-input bg-background rounded focus:ring-2 focus:ring-primary focus:ring-offset-0"
              />
            </div>
            <div>
              <label htmlFor="message" className="block mb-2 font-medium text-foreground">
                Message
              </label>
              <textarea
                id="message"
                rows={5}
                required
                className="w-full px-4 py-2 border border-input bg-background rounded focus:ring-2 focus:ring-primary focus:ring-offset-0"
              />
            </div>
            <Button type="submit" variant="primary">
              Envoyer
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export { Contact };