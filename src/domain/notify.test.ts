import { describe, expect, it } from 'vitest';
import { messengerLink, normalizeMessenger, normalizePhone, requestMessage, whatsappLink } from './notify';

describe('prévenir sur WhatsApp / Messenger', () => {
  it('normalise les numéros', () => {
    expect(normalizePhone('06 12 34 56 78')).toBe('33612345678');
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('33612345678');
    expect(normalizePhone('0033612345678')).toBe('33612345678');
    expect(normalizePhone('+32 470 12 34 56')).toBe('32470123456');
    expect(normalizePhone('06.12.34.56.78')).toBe('33612345678');
    expect(normalizePhone('12')).toBeNull();
    expect(normalizePhone('bonjour')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  it('extrait l’identifiant Messenger', () => {
    expect(normalizeMessenger('m.me/theo.pigagliot')).toBe('theo.pigagliot');
    expect(normalizeMessenger('https://m.me/theo.pigagliot')).toBe('theo.pigagliot');
    expect(normalizeMessenger('https://www.facebook.com/theo.pigagliot?locale=fr')).toBe('theo.pigagliot');
    expect(normalizeMessenger('https://www.facebook.com/profile.php?id=100012345678')).toBe('100012345678');
    expect(normalizeMessenger('https://www.messenger.com/t/theo.pigagliot')).toBe('theo.pigagliot');
    expect(normalizeMessenger('m.dupont')).toBe('m.dupont');
    expect(normalizeMessenger('@theo')).toBe('theo');
    expect(normalizeMessenger('pas valide !')).toBeNull();
  });

  it('construit les liens', () => {
    expect(whatsappLink('06 12 34 56 78', 'Salut & bravo')).toBe('https://wa.me/33612345678?text=Salut%20%26%20bravo');
    expect(whatsappLink(null, 'x')).toBe('https://wa.me/?text=x');
    expect(messengerLink('theo.p')).toBe('https://m.me/theo.p');
    expect(messengerLink(null)).toBe('https://www.messenger.com/');
  });

  it('rédige la demande d’emprunt', () => {
    const text = requestMessage({ siteUrl: 'https://site.fr', gameName: 'Azul', recipientName: 'Théo Martin', returnDate: '2026-10-20', note: 'Je passe samedi ?' });
    expect(text).toContain('Salut Théo !');
    expect(text).toContain('« Azul »');
    expect(text).toContain('Je passe samedi ?');
    expect(text).toContain('https://site.fr/my-loans');
  });
});
