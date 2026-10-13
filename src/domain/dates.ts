/** Date du jour au format AAAA-MM-JJ, dans le fuseau horaire de l'utilisateur. */
export const todayIso = (now: Date = new Date()): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Vérifie qu'une chaîne est une date calendaire valide au format AAAA-MM-JJ. */
export const isValidIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

/** Affiche une date AAAA-MM-JJ (ou ISO complète) en français, sans décalage de fuseau. */
export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const day = value.slice(0, 10);
  if (!isValidIsoDate(day)) return value;
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Nombre de jours entre aujourd'hui et la date donnée (négatif si dépassée). */
export const daysUntil = (isoDate: string, now: Date = new Date()): number => {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
};
