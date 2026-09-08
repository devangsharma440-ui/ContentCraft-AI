// src/test_429_fallback.test.ts
import { test, expect, beforeEach, afterEach } from 'bun:test';
import { discoverWorkingModel, safeCallGemini, callGemini } from '../custom-routes.ts';
import type { UserSession } from '../custom-routes.ts';

// Helper to create a mock Response
function mockResponse(status: number, body: any = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let fetchQueue: Response[] = [];

beforeEach(() => {
  fetchQueue = [];
  // @ts-ignore
  global.fetch = async (input: RequestInfo, init?: RequestInit) => {
    const resp = fetchQueue.shift();
    if (!resp) throw new Error('No mock response left in queue');
    return resp;
  };
});

afterEach(() => {
  // @ts-ignore
  delete (global as any).fetch;
});

test('first model 429 then second succeeds', async () => {
  fetchQueue.push(mockResponse(429)); // probe first model => rate limit
  fetchQueue.push(mockResponse(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] })); // second model works
  const apiKey = 'test-key';
  const result = await discoverWorkingModel(apiKey);
  expect(result.model).toBe('gemini-3.7-flash');
});

test('all candidates 429 returns rate limit error', async () => {
  for (let i = 0; i < 7; i++) fetchQueue.push(mockResponse(429));
  const apiKey = 'test-key';
  const result = await discoverWorkingModel(apiKey);
  expect(result.model).toBeNull();
  expect(result.error).toContain('rate limit');
});

test('404 leads to next model', async () => {
  fetchQueue.push(mockResponse(404)); // first model unavailable
  fetchQueue.push(mockResponse(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] })); // second works
  const apiKey = 'test-key';
  const result = await discoverWorkingModel(apiKey);
  expect(result.model).toBe('gemini-3.7-flash');
});

test('401 aborts without rotation', async () => {
  fetchQueue.push(mockResponse(401)); // auth error
  const apiKey = 'test-key';
  const result = await discoverWorkingModel(apiKey);
  expect(result.model).toBeNull();
  expect(result.error).toContain('invalid');
});

test('no duplicate model attempts', async () => {
  fetchQueue.push(mockResponse(429)); // first
  fetchQueue.push(mockResponse(429)); // second
  fetchQueue.push(mockResponse(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] })); // third
  const apiKey = 'test-key';
  const result = await discoverWorkingModel(apiKey);
  expect(result.model).toBe('gemini-3.6-flash');
  expect(fetchQueue.length).toBe(0);
});

test('cached model 429 invalidates and falls back', async () => {
  fetchQueue.push(mockResponse(429)); // cached model fails
  fetchQueue.push(mockResponse(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] })); // next works
  const session: UserSession = {
    userApiKey: null,
    cachedWorkingModel: 'gemini-3.8-flash',
    cachedModelKey: 'test-key',
    lastActive: Date.now(),
  };
  const apiKey = 'test-key';
  const result = await discoverWorkingModel(apiKey, session);
  expect(result.model).toBe('gemini-3.7-flash');
  expect(session.cachedWorkingModel).toBeNull();
});
