// Config Metro Expo par défaut + support des fichiers `.sql` générés par
// drizzle-kit (les migrations SQLite sont importées comme assets par
// `drizzle/migrations.js`). Sans l'ajout de `sql` aux sourceExts, Metro ne
// sait pas bundler les migrations → tables locales jamais créées.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
