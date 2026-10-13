import type { ReactNode } from 'react';
import { Dices } from 'lucide-react';

export const AuthLayout = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-terre-cuite-chaleureuse/20 text-brun-cafe-doux">
          <Dices className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="font-display text-3xl font-bold text-brun-cafe-doux">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>
      <div className="surface p-6 sm:p-8">{children}</div>
    </div>
  </main>
);

/**
 * Sur certains claviers AZERTY sous Windows, AltGr+0 (= Ctrl+Alt+0) ne produit pas « @ »
 * dans le navigateur. Ce raccourci insère « @ » à la position du curseur.
 */
export const insertAtSignOnAltGr0 = (value: string, setValue: (v: string) => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== '0' || !e.ctrlKey || !e.altKey) return;
  e.preventDefault();
  const input = e.currentTarget;
  const start = input.selectionStart ?? value.length;
  const end = input.selectionEnd ?? start;
  setValue(`${value.slice(0, start)}@${value.slice(end)}`);
  requestAnimationFrame(() => input.setSelectionRange(start + 1, start + 1));
};
