// Types pour le module de migrations généré par drizzle-kit (`migrations.js`),
// qui importe des `.sql` (résolus en chaîne par Metro via metro.config.js).
declare const migrations: {
  journal: {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
  };
  migrations: Record<string, string>;
};

export default migrations;
