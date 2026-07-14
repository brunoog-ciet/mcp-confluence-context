import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ConfluenceClient } from './client.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

const BASE_URL = 'https://confluence.example.com';
const TOKEN = 'test-token';
const client = new ConfluenceClient(BASE_URL, TOKEN);

const AUTH_HEADER = { headers: { Authorization: `Bearer ${TOKEN}` } };

describe('ConfluenceClient.fetchPage', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retorna id, title e text a partir do HTML da página', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        title: 'Guia de Auth',
        body: { storage: { value: '<p>Use OAuth 2.0</p>' } },
      },
    });

    const result = await client.fetchPage('123');

    expect(result.id).toBe('123');
    expect(result.title).toBe('Guia de Auth');
    expect(result.text).toContain('Use OAuth 2.0');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${BASE_URL}/rest/api/content/123?expand=body.storage,title`,
      AUTH_HEADER,
    );
  });

  it('lança erro descritivo quando pageId não existe (404)', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue({ response: { status: 404 } });

    await expect(client.fetchPage('999')).rejects.toThrow('Página não encontrada (pageId=999)');
  });

  it('lança erro genérico quando o Confluence está inacessível', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(client.fetchPage('123')).rejects.toThrow('Confluence inacessível: ECONNREFUSED');
  });
});

describe('ConfluenceClient.searchPages', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retorna lista de páginas com id, title e url', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        results: [
          { id: '10', title: 'OAuth Guide' },
          { id: '11', title: 'JWT Tokens' },
        ],
      },
    });

    const results = await client.searchPages('auth');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: '10',
      title: 'OAuth Guide',
      url: `${BASE_URL}/pages/viewpage.action?pageId=10`,
    });
  });

  it('inclui spaceKey no CQL quando fornecido', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { results: [] } });

    await client.searchPages('auth', 'DEV');

    const calledUrl = (mockedAxios.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain(encodeURIComponent('space="DEV"'));
  });
});

describe('ConfluenceClient.updatePageAsDraft', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('salva rascunho e retorna draftUrl', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        version: { number: 3 },
        space: { key: 'DEV' },
      },
    });
    mockedAxios.put = vi.fn().mockResolvedValue({ data: {} });

    const result = await client.updatePageAsDraft('42', 'Novo Título', '<p>Conteúdo</p>');

    expect(result.pageId).toBe('42');
    expect(result.title).toBe('Novo Título');
    expect(result.draftUrl).toContain('pageId=42');
    expect(result.draftUrl).toContain('draft=true');
  });

  it('incrementa a versão corretamente no PUT', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { version: { number: 5 }, space: { key: 'DEV' } },
    });
    mockedAxios.put = vi.fn().mockResolvedValue({ data: {} });

    await client.updatePageAsDraft('42', 'Título', '<p>X</p>');

    const body = (mockedAxios.put as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(body.version.number).toBe(6);
    expect(body.status).toBe('draft');
  });

  it('lança erro descritivo quando pageId não existe (404)', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue({ response: { status: 404 } });

    await expect(client.updatePageAsDraft('999', 'X', '<p></p>')).rejects.toThrow(
      'Página não encontrada (pageId=999)',
    );
  });

  it('lança erro descritivo quando o PUT falha', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { version: { number: 1 }, space: { key: 'DEV' } },
    });
    mockedAxios.put = vi.fn().mockRejectedValue(new Error('Forbidden'));

    await expect(client.updatePageAsDraft('42', 'X', '<p></p>')).rejects.toThrow(
      'Erro ao salvar rascunho: Forbidden',
    );
  });
});

describe('ConfluenceClient.listChildren', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('retorna páginas filhas com id, title e url', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        results: [{ id: '20', title: 'Subpágina A' }],
      },
    });

    const children = await client.listChildren('10');

    expect(children).toHaveLength(1);
    expect(children[0].id).toBe('20');
    expect(children[0].url).toContain('pageId=20');
  });

  it('retorna lista vazia quando não há filhas', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { results: [] } });

    const children = await client.listChildren('10');
    expect(children).toEqual([]);
  });
});
