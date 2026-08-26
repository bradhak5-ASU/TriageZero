import { expect, test } from '@playwright/test';
import {
  buildFailurePackageIdempotencyKey,
  submitFailurePackage,
} from '../helpers/triagezero-client';
import type { FailurePackage } from '../helpers/evidence';

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
      test_id: 'checkout-test',
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
      const second = await submitFailurePackage(
        {
          ...failurePackage,
          run: {
            ...failurePackage.run,
            run_id: 'local-run-2',
            started_at: '2026-08-25T20:00:02.000Z',
          },
          test: {
            ...failurePackage.test,
            retry: 1,
          },
        },
        { apiUrl: 'http://triagezero.test' }
      );

      expect(keys).toHaveLength(2);
      expect(keys[0]).toBe(keys[1]);
      expect(first.investigation_id).toBe(second.investigation_id);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
