import type { Server } from 'node:http';
export function serveWeb(options?: { port?: number; host?: string; root?: string }): Promise<{ httpServer: Server; url: string; setOnline(value: boolean): void }>;
