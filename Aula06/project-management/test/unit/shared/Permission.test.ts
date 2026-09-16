import { describe, expect, it } from 'vitest';
import { satisfies } from '../../../src/shared/kernel/Permission.js';

describe('satisfies (Shared Kernel)', () => {
  it('READ satisfaz READ', () => {
    expect(satisfies('READ', 'READ')).toBe(true);
  });

  it('WRITE satisfaz READ', () => {
    expect(satisfies('WRITE', 'READ')).toBe(true);
  });

  it('WRITE satisfaz WRITE', () => {
    expect(satisfies('WRITE', 'WRITE')).toBe(true);
  });

  it('READ não satisfaz WRITE', () => {
    expect(satisfies('READ', 'WRITE')).toBe(false);
  });
});
