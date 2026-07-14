import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CacheManager } from './manager.js';

const TEST_DIR = join(tmpdir(), `cache-test-${process.pid}`);

beforeEach(() => { mkdirSync(TEST_DIR, { recursive: true }); });
afterEach(() => { rmSync(TEST_DIR, { recursive: true, force: true }); });

const PAGE = { id: '42', title: 'Guia', text: 'Conteúdo da página' };

describe('CacheManager', () => {
  it('retorna null quando não há cache para o pageId', async () => {
    const mgr = new CacheManager(TEST_DIR, 3600);
    expect(await mgr.get('42')).toBeNull();
  });

  it('persiste e recupera uma página corretamente', async () => {
    const mgr = new CacheManager(TEST_DIR, 3600);
    await mgr.set(PAGE);

    const cached = await mgr.get('42');
    expect(cached?.id).toBe('42');
    expect(cached?.title).toBe('Guia');
    expect(cached?.text).toBe('Conteúdo da página');
  });

  it('retorna null quando o cache expirou (TTL = 0)', async () => {
    const mgr = new CacheManager(TEST_DIR, 0);
    await mgr.set(PAGE);

    await new Promise((r) => setTimeout(r, 10));
    expect(await mgr.get('42')).toBeNull();
  });

  it('retorna cache expirado quando forceStale = true', async () => {
    const mgr = new CacheManager(TEST_DIR, 0);
    await mgr.set(PAGE);

    await new Promise((r) => setTimeout(r, 10));
    const cached = await mgr.get('42', { forceStale: true });
    expect(cached?.text).toBe('Conteúdo da página');
  });

  it('caches de páginas diferentes são independentes', async () => {
    const mgr = new CacheManager(TEST_DIR, 3600);
    await mgr.set({ id: '1', title: 'P1', text: 'Texto 1' });
    await mgr.set({ id: '2', title: 'P2', text: 'Texto 2' });

    expect((await mgr.get('1'))?.text).toBe('Texto 1');
    expect((await mgr.get('2'))?.text).toBe('Texto 2');
    expect(await mgr.get('3')).toBeNull();
  });

  it('remove arquivo corrompido e retorna null', async () => {
    const mgr = new CacheManager(TEST_DIR, 3600);
    const filePath = join(TEST_DIR, 'page-99.json');
    writeFileSync(filePath, 'invalid json');

    expect(await mgr.get('99')).toBeNull();
    expect(existsSync(filePath)).toBe(false);
  });
});
