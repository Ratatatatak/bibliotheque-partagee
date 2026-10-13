/**
 * Ludothèque – traduction
 * Outil Google Apps Script qui traduit en français les descriptions des jeux
 * (Google Traduction, gratuit, jusqu'à 5 000 traductions par jour).
 * À coller tel quel sur script.google.com, puis Déployer → Application Web.
 */

var MAX_LENGTH = 20000;   // longueur maximale acceptée
var CHUNK = 4000;         // Google Traduction est appelé par morceaux de cette taille

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var text = String(data.text || '');
    if (!text.trim()) return reply_({ error: 'Texte manquant' });
    if (text.length > MAX_LENGTH) return reply_({ error: 'Texte trop long' });
    return reply_({ translation: translate_(text) });
  } catch (err) {
    return reply_({ error: String(err) });
  }
}

/** Permet de vérifier dans un navigateur que l'outil est bien en ligne. */
function doGet() {
  return reply_({ ok: true, service: 'ludotheque-traduction', exemple: LanguageApp.translate('Hello friends', 'en', 'fr') });
}

function translate_(text) {
  var paragraphs = text.split('\n');
  var chunks = [];
  var current = '';
  paragraphs.forEach(function (p) {
    if ((current + '\n' + p).length > CHUNK && current) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? current + '\n' + p : p;
    }
  });
  if (current) chunks.push(current);
  return chunks.map(function (chunk) {
    // Source vide = langue détectée automatiquement.
    return chunk.trim() ? LanguageApp.translate(chunk, '', 'fr') : chunk;
  }).join('\n');
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
