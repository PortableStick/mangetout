import { serve } from '@hono/node-server';

import { aiConfigured, config } from './config.ts';
import { createApp } from './server.ts';

serve({ fetch: createApp().fetch, port: config.port }, () => {
  // eslint-disable-next-line no-console
  console.log(`[ai-proxy] écoute sur :${config.port} (IA configurée: ${aiConfigured()})`);
});
