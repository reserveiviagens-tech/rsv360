import type { Express } from 'express';
import express from 'express';
import path from 'path';
import cmsRouter from './routes';
import { ensureHotelsUploadDir, resolveHotelsUploadDir } from './upload';

export function registerCmsModule(app: Express) {
  ensureHotelsUploadDir();
  const uploadRoot = path.dirname(resolveHotelsUploadDir()); // .../public/uploads
  app.use(
    '/uploads',
    express.static(uploadRoot, {
      maxAge: '30d',
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );
  app.use('/api/v1/cms', cmsRouter);
  console.log('[MODULE] CMS Vitrine registrado ✓');
}

export default cmsRouter;
module.exports = { registerCmsModule, cmsRouter };
