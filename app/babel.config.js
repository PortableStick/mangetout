module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Inline le contenu des `.sql` (migrations drizzle) comme chaîne au lieu de
    // le transpiler comme du JS — sinon Metro/Babel plante « Missing semicolon ».
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
