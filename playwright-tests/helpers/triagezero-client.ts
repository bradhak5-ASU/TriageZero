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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

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
    throw new Error(`TriageZero API returned HTTP ${response.status}: ${formatApiError(body, response.statusText)}`);
  }
  return body;
}

function fieldPathFromValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(String).join('.');
  if (!isRecord(value)) return undefined;

  const candidate = value.path ?? value.field ?? value.field_path ?? value.loc;
  if (candidate !== undefined) return fieldPathFromValue(candidate);
  return undefined;
}

function collectFieldPaths(value: unknown): string[] {
  if (!isRecord(value) && !Array.isArray(value)) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectFieldPaths(item));
  }

  const directFields = value.field_paths ?? value.fields ?? value.errors ?? value.detail;
  const directPath = fieldPathFromValue(value);
  const paths = directPath ? [directPath] : [];

  if (directFields !== undefined && directFields !== value) {
    paths.push(...collectFieldPaths(directFields));
  }

  return [...new Set(paths.filter(Boolean))];
}

function formatApiError(body: unknown, fallback: string): string {
  if (!isRecord(body)) return fallback;

  const errorBody = isRecord(body.error) ? body.error : body;
  const code = typeof errorBody.code === 'string' ? errorBody.code : undefined;
  const message =
    typeof errorBody.message === 'string'
      ? errorBody.message
      : typeof body.detail === 'string'
        ? body.detail
        : fallback;
  const fieldPaths = collectFieldPaths(errorBody);
  const codePrefix = code ? `${code}: ` : '';
  const fields = fieldPaths.length > 0 ? ` Fields: ${fieldPaths.join(', ')}` : '';

  return `${codePrefix}${message}${fields}`;
}

export function buildFailurePackageIdempotencyKey(failurePackage: FailurePackage): string {
  const testIdentity = `${failurePackage.test.file}#${failurePackage.test.name}`;
  const keyMaterial = `${failurePackage.run.run_id}:${testIdentity}`;

  return createHash('sha256').update(keyMaterial).digest('hex');
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
