import type { ConsoleMessage, Page, Request, Response, TestInfo } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const FORBIDDEN_AI_EVIDENCE_PATTERNS = [
  'expected_classification',
  'expected_root_cause',
  'expected_severity',
  'expected_release_risk',
  'expected_action',
  'defect_scenario',
  'checkout_500',
  'controlled defect',
  'novacart_defect_scenario',
];

const NORMALIZED_FORBIDDEN_AI_EVIDENCE_PATTERNS = FORBIDDEN_AI_EVIDENCE_PATTERNS.map((pattern) =>
  pattern.replace(/[^a-z0-9]/g, '')
);

function normalizeForEvidenceScan(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export type ApiEvidence = {
  method: string;
  url: string;
  status?: number;
  failureText?: string;
};

export type SubmittedNetworkEvidence = {
  method: string;
  url: string;
  status: number;
};

export type FailureEvidenceOptions = {
  testInfo: TestInfo;
  error: Error;
  consoleErrors: string[];
  apiEvents: ApiEvidence[];
  expectedValue?: number | string;
  actualValue?: number | string;
};

export type AiSafeFailureEvidence = {
  testName: string;
  testFile: string;
  expectedResult: string;
  actualResult: string;
  errorMessage: string;
  stackTrace?: string;
  expectedValue?: number | string;
  actualValue?: number | string;
  retryNumber: number;
  browserProjectName: string;
  runMetadata: {
    capturedAt: string;
  };
  browserConsoleErrors: string[];
  failedApiRequests: ApiEvidence[];
};

export type FailurePackage = {
  schema_version: '1.0';
  source: 'novacart-playwright';
  run: {
    run_id: string;
    trigger: 'local';
    started_at: string;
  };
  repository: {
    name: string;
    branch: string;
    commit_sha: string;
  };
  environment: {
    name: 'local';
    target_url: string;
    browser: string;
  };
  test: {
    name: string;
    file: string;
    status: 'failed';
    retry: number;
  };
  failure: {
    message: string;
    stack_trace?: string;
    expected?: string;
    actual?: string;
  };
  network_evidence: SubmittedNetworkEvidence[];
  console_errors: string[];
  artifacts: {
    screenshot_path: string;
    trace_path: string;
  };
};

export function attachEvidenceCapture(page: Page) {
  const consoleErrors: string[] = [];
  const apiEvents = new Map<string, ApiEvidence>();

  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    consoleErrors.push(message.text());
  });

  page.on('response', (response: Response) => {
    if (!response.url().includes('/api/')) return;

    const request = response.request();
    apiEvents.set(`${request.method()} ${response.url()}`, {
      method: request.method(),
      url: response.url(),
      status: response.status(),
    });
  });

  page.on('requestfailed', (request: Request) => {
    const url = request.url();
    if (!url.includes('/api/')) return;

    apiEvents.set(`${request.method()} ${url}`, {
      method: request.method(),
      url,
      failureText: request.failure()?.errorText,
    });
  });

  return {
    consoleErrors,
    apiEvents,
  };
}

function collectForbiddenEvidenceMatches(value: unknown, path = '$'): string[] {
  const matches: string[] = [];

  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    const compactNormalized = normalizeForEvidenceScan(value);
    for (const pattern of FORBIDDEN_AI_EVIDENCE_PATTERNS) {
      if (normalized.includes(pattern)) {
        matches.push(`${path} contains forbidden value "${pattern}"`);
      }
    }
    NORMALIZED_FORBIDDEN_AI_EVIDENCE_PATTERNS.forEach((pattern, index) => {
      if (compactNormalized.includes(pattern)) {
        matches.push(`${path} contains forbidden value "${FORBIDDEN_AI_EVIDENCE_PATTERNS[index]}"`);
      }
    });
    return matches;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      matches.push(...collectForbiddenEvidenceMatches(item, `${path}[${index}]`));
    });
    return matches;
  }

  if (value && typeof value === 'object') {
    for (const [key, childValue] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      const compactNormalizedKey = normalizeForEvidenceScan(key);
      for (const pattern of FORBIDDEN_AI_EVIDENCE_PATTERNS) {
        if (normalizedKey.includes(pattern)) {
          matches.push(`${path}.${key} uses forbidden field "${pattern}"`);
        }
      }
      NORMALIZED_FORBIDDEN_AI_EVIDENCE_PATTERNS.forEach((pattern, index) => {
        if (compactNormalizedKey.includes(pattern)) {
          matches.push(`${path}.${key} uses forbidden field "${FORBIDDEN_AI_EVIDENCE_PATTERNS[index]}"`);
        }
      });
      matches.push(...collectForbiddenEvidenceMatches(childValue, `${path}.${key}`));
    }
  }

  return matches;
}

export function validateEvidenceForAI(evidence: unknown): void {
  const matches = collectForbiddenEvidenceMatches(evidence);
  if (matches.length > 0) {
    throw new Error(`Outbound evidence contains forbidden QA metadata: ${matches.join('; ')}`);
  }
}

function readGitValue(args: string[], fallback: string): string {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return fallback;
  }
}

function getRepositoryMetadata() {
  return {
    name: 'novacart-target',
    branch: readGitValue(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown'),
    commit_sha: readGitValue(['rev-parse', 'HEAD'], 'unknown'),
  };
}

function repositoryRoot(): string {
  return path.resolve(process.cwd(), '..');
}

function toRepositoryRelativePath(filePath: string): string {
  return path.relative(repositoryRoot(), filePath).replaceAll(path.sep, '/');
}

function toPlaywrightRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, '/');
}

function sanitizeStackTrace(stackTrace?: string): string | undefined {
  if (!stackTrace) return undefined;

  const repoRoot = repositoryRoot();
  const playwrightRoot = process.cwd();

  return stripAnsiControlCodes(stackTrace)
    .replaceAll(`${repoRoot}${path.sep}`, '')
    .replaceAll(`${playwrightRoot}${path.sep}`, 'playwright-tests/');
}

export function stripAnsiControlCodes(value: string): string {
  return value.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[\]()#;?]*(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g,
    ''
  );
}

export function normalizeNetworkEvidence(apiEvents: ApiEvidence[]): SubmittedNetworkEvidence[] {
  return apiEvents.map((event) => ({
    method: event.method,
    url: event.url,
    status: typeof event.status === 'number' ? event.status : 0,
  }));
}

function buildRunId(testInfo: TestInfo, startedAt: string): string {
  const safeTestName = testInfo.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const timestamp = startedAt.replace(/[^0-9]/g, '');
  return `${safeTestName || 'playwright-test'}-${timestamp}-${testInfo.retry}`;
}

export function buildFailurePackage(
  evidence: AiSafeFailureEvidence,
  testInfo: TestInfo
): FailurePackage {
  const startedAt = evidence.runMetadata.capturedAt;

  return {
    schema_version: '1.0',
    source: 'novacart-playwright',
    run: {
      run_id: buildRunId(testInfo, startedAt),
      trigger: 'local',
      started_at: startedAt,
    },
    repository: getRepositoryMetadata(),
    environment: {
      name: 'local',
      target_url: process.env.NOVACART_BASE_URL || 'http://localhost:5173',
      browser: evidence.browserProjectName,
    },
    test: {
      name: evidence.testName,
      file: toRepositoryRelativePath(evidence.testFile),
      status: 'failed',
      retry: evidence.retryNumber,
    },
    failure: {
      message: stripAnsiControlCodes(evidence.errorMessage),
      stack_trace: sanitizeStackTrace(evidence.stackTrace),
      expected: evidence.expectedValue === undefined ? undefined : String(evidence.expectedValue),
      actual: evidence.actualValue === undefined ? undefined : String(evidence.actualValue),
    },
    network_evidence: normalizeNetworkEvidence(evidence.failedApiRequests),
    console_errors: evidence.browserConsoleErrors,
    artifacts: {
      screenshot_path: toPlaywrightRelativePath(testInfo.outputPath('test-failed-1.png')),
      trace_path: toPlaywrightRelativePath(testInfo.outputPath('trace.zip')),
    },
  };
}

export async function writeFailurePackage(
  evidence: AiSafeFailureEvidence,
  testInfo: TestInfo
) {
  const failurePackage = buildFailurePackage(evidence, testInfo);
  validateEvidenceForAI(failurePackage);

  const packagePath = testInfo.outputPath('failure-package.json');
  await writeFile(packagePath, JSON.stringify(failurePackage, null, 2));
  await testInfo.attach('failure-package', {
    path: packagePath,
    contentType: 'application/json',
  });

  return {
    failurePackage,
    packagePath,
  };
}

async function writeTriageZeroUploadAttachment(
  testInfo: TestInfo,
  content: object,
  fileName: string
) {
  const uploadPath = testInfo.outputPath(fileName);
  await writeFile(uploadPath, JSON.stringify(content, null, 2));
  await testInfo.attach(fileName.replace('.json', ''), {
    path: uploadPath,
    contentType: 'application/json',
  });
}

async function submitFailurePackageIfConfigured(failurePackage: FailurePackage, testInfo: TestInfo) {
  if (!process.env.TRIAGEZERO_API_URL) return;

  try {
    const { buildFailurePackageIdempotencyKey, submitFailurePackage } = await import('./triagezero-client');
    const result = await submitFailurePackage(failurePackage);
    const uploadSummary = {
      httpStatus: result.httpStatus,
      investigation_id: result.investigation_id,
      status: result.status,
      received_at: result.received_at,
      idempotency_key: buildFailurePackageIdempotencyKey(failurePackage),
    };

    console.log(
      `TriageZero upload: HTTP ${result.httpStatus}, investigation_id=${result.investigation_id}, status=${result.status}`
    );
    await writeTriageZeroUploadAttachment(testInfo, uploadSummary, 'triagezero-upload.json');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`TriageZero upload failed; local failure evidence was retained. ${message}`);
    await writeTriageZeroUploadAttachment(
      testInfo,
      {
        error: message,
      },
      'triagezero-upload-error.json'
    );
  }
}

export async function writeFailureEvidence({
  testInfo,
  error,
  consoleErrors,
  apiEvents,
  expectedValue,
  actualValue,
}: FailureEvidenceOptions) {
  const evidence: AiSafeFailureEvidence = {
    testName: testInfo.title,
    testFile: testInfo.file,
    expectedResult: 'Checkout order request should return HTTP 201 and show the order confirmation page.',
    actualResult: `Checkout order request returned HTTP ${actualValue ?? 'unknown'} before confirmation appeared.`,
    errorMessage: error.message,
    stackTrace: error.stack,
    expectedValue,
    actualValue,
    retryNumber: testInfo.retry,
    browserProjectName: testInfo.project.name,
    runMetadata: {
      capturedAt: new Date().toISOString(),
    },
    browserConsoleErrors: consoleErrors,
    failedApiRequests: apiEvents.filter((event) => event.status === undefined || event.status >= 400),
  };

  validateEvidenceForAI(evidence);

  const evidencePath = testInfo.outputPath('failure-evidence.json');
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  await testInfo.attach('failure-evidence', {
    path: evidencePath,
    contentType: 'application/json',
  });

  const { failurePackage } = await writeFailurePackage(evidence, testInfo);
  await submitFailurePackageIfConfigured(failurePackage, testInfo);

  return evidence;
}
