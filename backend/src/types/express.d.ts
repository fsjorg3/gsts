import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface Request {
      id?: string | number;
      log: Logger;
    }
  }
}

export {};
