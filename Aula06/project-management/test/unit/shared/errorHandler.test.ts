import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { errorHandler } from '../../../src/shared/http/errorHandler.js';

function buildFakeResponse(): Response {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  it('mapeia um erro desconhecido para 500', () => {
    const res = buildFakeResponse();

    errorHandler(new Error('algo inesperado'), {} as unknown as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'algo inesperado' });
  });
});
