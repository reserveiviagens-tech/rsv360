/**
 * @jest-environment node
 */
import express from 'express';
import request from 'supertest';
import {
  registerDeadModuleStubs,
  DEAD_PREFIXES,
} from '../../routes/dead-modules.route';

describe('dead-modules 410 stubs (Aruanda B1)', () => {
  const app = express();
  registerDeadModuleStubs(app);
  app.use((_req, res) => {
    res.status(404).json({ error: 'not-stub' });
  });

  test.each(DEAD_PREFIXES)('%s returns 410 MODULE_DEAD', async (prefix) => {
    const res = await request(app).get(`${prefix}/any`);
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('MODULE_DEAD');
    expect(res.body.success).toBe(false);
  });
});
