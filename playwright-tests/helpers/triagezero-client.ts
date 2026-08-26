import { createHash } from 'node:crypto';
import { validateEvidenceForAI, type FailurePackage } from './evidence';

type SubmitResult = {
  httpStatus: number;
  investigation_id?: string;
  status?: string;
  received_at?: string;
};

type InvestigationResult = {
  httpStatus: number;
  body: unknown;
};

type ClientOptions = {
  apiUrl?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`TriageZero API request timed out after ${timeoutMs}ms.`);
    }
    throw new Error(`TriageZero API unavailable: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

function apiBaseUrl(apiUrl = process.env.TRIAGEZERO_API_URL): string {
  if (!apiUrl) {
    throw new Error('TRIAGEZERO_API_URL is required to submit failure packages.');
  }
  return apiUrl.replace(/\/$/, '');
}

async function parseJsonResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === 'object' && 'detail' in body ? JSON.stringify(body.detail) : response.statusText;
    throw new Error(`TriageZero API returned HTTP ${response.status}: ${detail}`);
  }
  return body;
}

export function buildFailurePackageIdempotencyKey(failurePackage: FailurePackage): string {
  const stablePayload = {
    schema_version: failurePackage.schema_version,
    source: failurePackage.source,
    repository: failurePackage.repository,
    environment: failurePackage.environment,
    test: {
      test_id: failurePackage.test.test_id,
      name: failurePackage.test.name,
      file: failurePackage.test.file,
    },
    failure: {
      expected: failurePackage.failure.expected,
      actual: failurePackage.failure.actual,
    },
    network_evidence: failurePackage.network_evidence,
  };

  return createHash('sha256').update(JSON.stringify(stablePayload)).digest('hex');
}

export async function submitFailurePackage(
  failurePackage: FailurePackage,
  options: ClientOptions = {}
): Promise<SubmitResult> {
  validateEvidenceForAI(failurePackage);
  const idempotencyKey = buildFailurePackageIdempotencyKey(failurePackage);

  const response = await fetchWithTimeout(
    `${apiBaseUrl(options.apiUrl)}/api/v1/investigations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(failurePackage),
    },
    options.timeoutMs
  );

  const body = await parseJsonResponse(response);
  if (!body || typeof body !== 'object' || !('investigation_id' in body)) {
    throw new Error('TriageZero API response did not include investigation_id.');
  }

  return {
    httpStatus: response.status,
    investigation_id: String(body.investigation_id),
    status: 'status' in body ? String(body.status) : undefined,
    received_at: 'received_at' in body ? String(body.received_at) : undefined,
  };
}

export async function getInvestigation(
  investigationId: string,
  options: ClientOptions = {}
): Promise<InvestigationResult> {
  const response = await fetchWithTimeout(
    `${apiBaseUrl(options.apiUrl)}/api/v1/investigations/${investigationId}`,
    {
      method: 'GET',
    },
    options.timeoutMs
  );

  return {
    httpStatus: response.status,
    body: await parseJsonResponse(response),
  };
}
