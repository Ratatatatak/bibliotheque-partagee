// Messages « prévenir sur WhatsApp / Messenger ».
//
// Le site n'envoie rien lui-même : il prépare le message et ouvre la
// conversation ; la personne n'a plus qu'à appuyer sur « Envoyer ».

import { formatDate } from './dates';

/**
 * Normalise un numéro de téléphone au format international sans « + »
 * (ce qu'attend wa.me). Les numéros français commençant par 0 reçoivent
 * l'indicatif 33. Renvoie null si le numéro n'est pas exploitable.
 */
export const normalizePhone = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  let digits = raw.trim().replace(/[\s.\-()/]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (/^0\d{9}$/.test(digits)) digits = `33${digits.slice(1)}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
};

/**
 * Extrait l'identifiant Messenger d'une saisie : « m.me/prenom.nom »,
 * une adresse facebook.com/prenom.nom, ou directement « prenom.nom ».
 */
export const normalizeMessenger = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;
  value = value
    .replace(/^https?:\/\//i, '')
    .replace(/^(?:www\.|web\.|m\.)?(?:facebook\.com|messenger\.com)\//i, 'fb/');
  // Adresse d'une conversation (messenger.com/t/123… ou /e2ee/t/…) : ce n'est pas un profil.
  if (/^fb\/(e2ee\/)?t\/\d+/i.test(value) || /^fb\/e2ee\//i.test(value)) return null;
  const profileId = value.match(/^fb\/profile\.php\?id=(\d+)/i);
  if (profileId) return profileId[1];
  value = value.replace(/^fb\/(?:t\/)?/i, '').replace(/^m\.me\//i, '');
  value = value.split(/[/?#]/)[0].replace(/^@/, '');
  return /^[A-Za-z0-9.]{3,50}$/.test(value) ? value : null;
};

export const whatsappLink = (phone: string | null | undefined, text: string) => {
  const number = normalizePhone(phone);
  return `https://wa.me/${number ?? ''}?text=${encodeURIComponent(text)}`;
};

export const messengerLink = (handle: string | null | undefined) => {
  const id = normalizeMessenger(handle);
  return id ? `https://m.me/${id}` : 'https://www.messenger.com/';
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

type Base = { siteUrl: string; gameName: string; recipientName: string };

export const requestMessage = ({ siteUrl, gameName, recipientName, returnDate, note }: Base & { returnDate: string; note?: string | null }) =>
  [
    `🎲 Salut ${firstName(recipientName)} ! Je t'ai demandé « ${gameName} » sur la ludothèque, jusqu'au ${formatDate(returnDate)}.`,
    note?.trim() ? note.trim() : null,
    `Tu peux accepter ou refuser ici : ${siteUrl}/my-loans`,
  ].filter(Boolean).join('\n');

export const acceptedMessage = ({ siteUrl, gameName, recipientName, returnDate }: Base & { returnDate: string }) =>
  `🎲 C'est bon ${firstName(recipientName)}, je te prête « ${gameName} » jusqu'au ${formatDate(returnDate)} ! On s'organise pour la remise ?\n${siteUrl}/my-loans`;

export const refusedMessage = ({ gameName, recipientName }: Base) =>
  `🎲 Désolé ${firstName(recipientName)}, je ne peux pas te prêter « ${gameName} » cette fois-ci.`;

export const reminderMessage = ({ gameName, recipientName, returnDate }: Base & { returnDate: string }) =>
  `🎲 Petit rappel ${firstName(recipientName)} : « ${gameName} » était prévu pour un retour le ${formatDate(returnDate)}. On s'organise ?`;
