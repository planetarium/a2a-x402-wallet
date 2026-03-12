import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateApiKey } from '../lib/a2a-device-store';

// ---------------------------------------------------------------------------
// generateApiKey
// ---------------------------------------------------------------------------

describe('generateApiKey', () => {
  it('returns a string starting with sk-', () => {
    const key = generateApiKey();
    expect(key).toMatch(/^sk-[0-9a-f]{48}$/);
  });

  it('generates unique keys each call', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
    expect(keys.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// A2ADeviceStore (logic tested with a mock DB)
// ---------------------------------------------------------------------------

// We mock the DB module so no real Postgres connection is needed.
vi.mock('../lib/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../lib/schema', () => ({
  a2aDeviceCodes: 'a2aDeviceCodes',
  a2aApiKeys: 'a2aApiKeys',
}));

// After mocking, import the store so it picks up the mocked db.
const { a2aDeviceStore } = await import('../lib/a2a-device-store');
const { db } = await import('../lib/db');

function makeMockDb() {
  const chainMock = {
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockResolvedValue([]),
    from: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  };
  return chainMock;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('a2aDeviceStore.create', () => {
  it('inserts a new device code row', async () => {
    const chain = makeMockDb();
    vi.mocked(db.insert).mockReturnValue(chain as never);

    await a2aDeviceStore.create('test-code', 'WXYZ-ABCD', 60_000);

    expect(db.insert).toHaveBeenCalledWith('a2aDeviceCodes');
    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'test-code', userCode: 'WXYZ-ABCD' }),
    );
  });
});

describe('a2aDeviceStore.get', () => {
  it('returns undefined when no row found', async () => {
    const chain = makeMockDb();
    chain.limit.mockResolvedValue([]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const result = await a2aDeviceStore.get('missing-code');
    expect(result).toBeUndefined();
  });

  it('returns entry with apiKey when row exists', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const chain = makeMockDb();
    chain.limit.mockResolvedValue([{ code: 'abc', apiKey: 'sk-xxx', expiresAt }]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const result = await a2aDeviceStore.get('abc');
    expect(result).toEqual({ apiKey: 'sk-xxx', expiresAt });
  });

  it('returns entry without apiKey when still pending', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const chain = makeMockDb();
    chain.limit.mockResolvedValue([{ code: 'abc', apiKey: null, expiresAt }]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const result = await a2aDeviceStore.get('abc');
    expect(result).toEqual({ apiKey: undefined, expiresAt });
  });
});

describe('a2aDeviceStore.complete', () => {
  it('returns false when code not found or expired', async () => {
    const chain = makeMockDb();
    chain.returning.mockResolvedValue([]);
    vi.mocked(db.update).mockReturnValue(chain as never);

    const ok = await a2aDeviceStore.complete('expired-code', 'sk-xxx');
    expect(ok).toBe(false);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('returns true and inserts api_key when code is valid', async () => {
    const updateChain = makeMockDb();
    updateChain.returning.mockResolvedValue([{ code: 'valid-code' }]);
    vi.mocked(db.update).mockReturnValue(updateChain as never);

    const insertChain = makeMockDb();
    vi.mocked(db.insert).mockReturnValue(insertChain as never);

    const ok = await a2aDeviceStore.complete('valid-code', 'sk-abc');
    expect(ok).toBe(true);
    expect(db.insert).toHaveBeenCalledWith('a2aApiKeys');
    expect(insertChain.values).toHaveBeenCalledWith({ apiKey: 'sk-abc' });
  });
});

describe('a2aDeviceStore.validateApiKey', () => {
  it('returns false when api key does not exist', async () => {
    const chain = makeMockDb();
    chain.limit.mockResolvedValue([]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const valid = await a2aDeviceStore.validateApiKey('sk-invalid');
    expect(valid).toBe(false);
  });

  it('returns true when api key exists', async () => {
    const chain = makeMockDb();
    chain.limit.mockResolvedValue([{ apiKey: 'sk-valid' }]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const valid = await a2aDeviceStore.validateApiKey('sk-valid');
    expect(valid).toBe(true);
  });
});
