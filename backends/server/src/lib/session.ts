import type { MiddlewareHandler } from 'hono';

import { auth, type Session } from '../auth.js';

export type AuthEnv = { Variables: { user: Session['user']; session: Session['session'] } };

/** Пропускает только вошедших: cookie (веб) или Authorization: Bearer (приложение). */
export const requireUser: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  c.set('user', session.user);
  c.set('session', session.session);
  await next();
};
