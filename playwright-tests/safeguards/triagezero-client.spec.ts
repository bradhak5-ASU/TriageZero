import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  buildFailurePackageIdempotencyKey,
  submitFailurePackage,
} from '../helpers/triagezero-client';
import { normalizeNetworkEvidence, type FailurePackage } from '../helpers/evidence';

function sampleFailurePackage(): FailurePackage {
  return {
    schema_version: '1.0',
    source: 'novacart-playwright',
    run: {
      run_id: 'local-run-1',
      trigger: 'local',
      started_at: '2026-08-25T20:00:00.000Z',
    },
    repository: {
      name: 'novacart-target',
      branch: 'main',
      commit_sha: 'abc123',
    },
    environment: {
      name: 'local',
      target_url: 'http://localhost:5173',
      browser: 'chromium',
    },
    test: {
      name: 'successful checkout shows confirmation page',
      file: 'playwright-tests/tests/novacart-baseline.spec.ts',
      status: 'failed',
      retry: 0,
    },
    failure: {
      message: 'Expected: 201\nReceived: 500',
      stack_trace: 'at playwright-tests/tests/novacart-baseline.spec.ts:101:27',
      expected: '201',
      actual: '500',
    },
    network_evidence: [
      {
        method: 'POST',
        url: 'http://localhost:8000/api/v1/orders',
        status: 500,
      },
    ],
    console_errors: [],
    artifacts: {
      screenshot_path: 'test-results/run/test-failed-1.png',
      trace_path: 'test-results/run/trace.zip',
    },
  };
}

function jsonResponse(body: unknown, status = 202) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

test.describe('TriageZero failure package client', () => {
  test.afterEach(() => {
    test.info().annotations.push({ type: 'cleanup', description: 'fetch restored' });
  });

  test('uploads a valid package and returns the investigation summary', async () => {
    const requests: { url: string; init: RequestInit }[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      requests.push({ url: String(input), init: init ?? {} });
      return jsonResponse({
        investigation_id: 'inv-123',
        status: 'received',
        received_at: '2026-08-25T20:00:01.000Z',
      });
    };

    try {
      const failurePackage = sampleFailurePackage();
      const result = await submitFailurePackage(failurePackage, { apiUrl: 'http://triagezero.test' });

      expect(result).toEqual({
        httpStatus: 202,
        investigation_id: 'inv-123',
        status: 'received',
        received_at: '2026-08-25T20:00:01.000Z',
      });
      expect(requests[0].url).toBe('http://triagezero.test/api/v1/investigations');
      expect((requests[0].init.headers as Record<string, string>)['Idempotency-Key']).toBe(
        buildFailurePackageIdempotencyKey(failurePackage)
      );
      expect(JSON.parse(String(requests[0].init.body))).toEqual(failurePackage);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('sends the ingestion token only as a bearer header', async () => {
    const requests: { init: RequestInit }[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      requests.push({ init: init ?? {} });
      return jsonResponse({ investigation_id: 'inv-auth', status: 'received' });
    };

    try {
      const token = 'local-ingestion-token-that-is-never-in-evidence';
      await submitFailurePackage(sampleFailurePackage(), {
        apiUrl: 'http://triagezero.test',
        apiToken: token,
      });

      const request = requests[0].init;
      expect((request.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`);
      expect(String(request.body)).not.toContain(token);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('rejects forbidden evidence before upload', async () => {
    let requestCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      requestCount += 1;
      return jsonResponse({});
    };

    try {
      await expect(
        submitFailurePackage(
          {
            ...sampleFailurePackage(),
            expected_classification: 'backend_application_defect',
          } as unknown as FailurePackage,
          { apiUrl: 'http://triagezero.test' }
        )
      ).rejects.toThrow(/expected_classification/);
      expect(requestCount).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('reports unavailable TriageZero backend clearly', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new TypeError('connect ECONNREFUSED');
    };

    try {
      await expect(
        submitFailurePackage(sampleFailurePackage(), { apiUrl: 'http://triagezero.test', timeoutMs: 500 })
      ).rejects.toThrow(/TriageZero API unavailable/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('uses a stable idempotency key for duplicate submissions', async () => {
    const keys: string[] = [];
    const investigationByKey = new Map<string, string>();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      const key = (init?.headers as Record<string, string>)['Idempotency-Key'];
      keys.push(key);
      if (!investigationByKey.has(key)) {
        investigationByKey.set(key, `inv-${investigationByKey.size + 1}`);
      }

      return jsonResponse({
        investigation_id: investigationByKey.get(key),
        status: 'received',
        received_at: '2026-08-25T20:00:01.000Z',
      });
    };

    try {
      const failurePackage = sampleFailurePackage();
      const first = await submitFailurePackage(failurePackage, { apiUrl: 'http://triagezero.test' });
      const second = await submitFailurePackage({ ...failurePackage }, { apiUrl: 'http://triagezero.test' });

      expect(keys).toHaveLength(2);
      expect(keys[0]).toBe(keys[1]);
      expect(first.investigation_id).toBe(second.investigation_id);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('submitted package contains no test_id', async () => {
    const requests: { init: RequestInit }[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      requests.push({ init: init ?? {} });
      return jsonResponse({ investigation_id: 'inv-123', status: 'received' });
    };

    try {
      await submitFailurePackage(sampleFailurePackage(), { apiUrl: 'http://triagezero.test' });
      const body = JSON.parse(String(requests[0].init.body));

      expect(body.test).not.toHaveProperty('test_id');
      expect(JSON.stringify(body)).not.toContain('test_id');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('submitted network entries have exactly method, url, and numeric status', async () => {
    const requests: { init: RequestInit }[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      requests.push({ init: init ?? {} });
      return jsonResponse({ investigation_id: 'inv-123', status: 'received' });
    };

    try {
      await submitFailurePackage(sampleFailurePackage(), { apiUrl: 'http://triagezero.test' });
      const body = JSON.parse(String(requests[0].init.body));

      for (const event of body.network_evidence) {
        expect(Object.keys(event).sort()).toEqual(['method', 'status', 'url']);
        expect(typeof event.status).toBe('number');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('normalizes a failed connection to status 0 without failureText', async () => {
    const normalized = normalizeNetworkEvidence([
      {
        method: 'GET',
        url: 'http://localhost:8000/api/v1/products',
        failureText: 'net::ERR_CONNECTION_REFUSED',
      },
    ]);

    expect(normalized).toEqual([
      {
        method: 'GET',
        url: 'http://localhost:8000/api/v1/products',
        status: 0,
      },
    ]);
    expect(JSON.stringify(normalized)).not.toContain('failureText');
  });

  test('different runs produce different idempotency keys', async () => {
    const first = sampleFailurePackage();
    const second = {
      ...first,
      run: {
        ...first.run,
        run_id: 'local-run-2',
      },
    };

    expect(buildFailurePackageIdempotencyKey(first)).not.toBe(buildFailurePackageIdempotencyKey(second));
  });

  test('replay of the same package produces the same idempotency key', async () => {
    const failurePackage = sampleFailurePackage();

    expect(buildFailurePackageIdempotencyKey(failurePackage)).toBe(
      buildFailurePackageIdempotencyKey(JSON.parse(JSON.stringify(failurePackage)))
    );
  });

  test('shows structured TriageZero validation errors clearly', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      jsonResponse(
        {
          error: {
            code: 'invalid_failure_package',
            message: 'Request body failed schema validation.',
            fields: [
              { path: 'test.test_id', message: 'Extra inputs are not permitted.' },
              { path: ['network_evidence', 0, 'failureText'], message: 'Extra inputs are not permitted.' },
            ],
          },
        },
        422
      );

    try {
      await expect(
        submitFailurePackage(sampleFailurePackage(), { apiUrl: 'http://triagezero.test' })
      ).rejects.toThrow(
        /HTTP 422: invalid_failure_package: Request body failed schema validation\. Fields: test\.test_id, network_evidence\.0\.failureText/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('NovaCart has no investigation storage endpoints', async () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const router = readFileSync(path.join(repoRoot, 'backend/app/api/v1/router.py'), 'utf8');
    const modelsInit = readFileSync(path.join(repoRoot, 'backend/app/models/__init__.py'), 'utf8');
    const dbInit = readFileSync(path.join(repoRoot, 'backend/app/db/init_db.py'), 'utf8');

    expect(router).not.toContain('@router.post("/investigations"');
    expect(router).not.toContain('@router.get("/investigations/');
    expect(router).not.toContain('Investigation');
    expect(modelsInit).not.toContain('Investigation');
    expect(dbInit).not.toContain('Investigation');
    expect(existsSync(path.join(repoRoot, 'backend/app/models/investigation.py'))).toBe(false);
    expect(existsSync(path.join(repoRoot, 'backend/app/schemas/investigation.py'))).toBe(false);
  });
});
