import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that checks for a valid API key in the x-api-key header.
 * Returns 401 Unauthorized if the key is missing or invalid.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!apiKey || apiKey !== process.env.API_KEY) {
        res.status(401).json({ error: 'Unauthorized – invalid or missing API key' });
        return;
    }

    next();
}
