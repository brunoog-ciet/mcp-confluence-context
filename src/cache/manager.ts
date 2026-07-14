import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { CachedPage } from '../types.js';

export class CacheManager {
  constructor(
    private readonly dir: string,
    private readonly ttlSeconds: number,
  ) {
    mkdirSync(dir, { recursive: true });
  }

  private filePath(pageId: string): string {
    return join(this.dir, `page-${pageId}.json`);
  }

  async get(pageId: string, opts: { forceStale?: boolean } = {}): Promise<CachedPage | null> {
    const filePath = this.filePath(pageId);
    if (!existsSync(filePath)) return null;

    let cached: CachedPage;
    try {
      cached = JSON.parse(readFileSync(filePath, 'utf-8')) as CachedPage;
    } catch {
      rmSync(filePath, { force: true });
      return null;
    }

    const ageSeconds = (Date.now() - cached.fetchedAt) / 1000;
    if (!opts.forceStale && ageSeconds > this.ttlSeconds) return null;

    return cached;
  }

  async invalidate(pageId: string): Promise<void> {
    rmSync(this.filePath(pageId), { force: true });
  }

  async set(page: { id: string; title: string; text: string }): Promise<void> {
    const data: CachedPage = { ...page, fetchedAt: Date.now() };
    writeFileSync(this.filePath(page.id), JSON.stringify(data, null, 2), { mode: 0o600 });
  }
}
