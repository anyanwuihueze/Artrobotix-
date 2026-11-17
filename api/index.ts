import type { Request, Response } from 'express';

import app from '../build/server.mjs';

export default function handler(req: Request, res: Response) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const originalPath = requestUrl.searchParams.get('__jg_original_path');

  if (originalPath !== null) {
    requestUrl.searchParams.delete('__jg_original_path');
    req.url = `/api/${originalPath}${requestUrl.search}`;
  }

  return app(req, res);
}
