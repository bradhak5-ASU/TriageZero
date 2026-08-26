import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FailurePackage } from '../helpers/evidence';
import { getInvestigation, submitFailurePackage } from '../helpers/triagezero-client';

async function main() {
  const packagePath = process.argv[2];
  if (!packagePath) {
    throw new Error('Usage: npm run submit:package -- <path-to-failure-package.json>');
  }

  let failurePackage: unknown;
  const resolvedPath = resolve(packagePath);

  try {
    failurePackage = JSON.parse(await readFile(resolvedPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid package file: ${error instanceof Error ? error.message : String(error)}`);
  }

  const submitResult = await submitFailurePackage(failurePackage as FailurePackage);
  console.log(`POST /api/v1/investigations -> HTTP ${submitResult.httpStatus}`);
  console.log(`investigation_id: ${submitResult.investigation_id}`);
  console.log(`status: ${submitResult.status}`);
  if (submitResult.received_at) {
    console.log(`received_at: ${submitResult.received_at}`);
  }

  if (!submitResult.investigation_id) {
    throw new Error('Missing investigation_id after submission.');
  }

  const investigation = await getInvestigation(submitResult.investigation_id);
  console.log(`GET /api/v1/investigations/${submitResult.investigation_id} -> HTTP ${investigation.httpStatus}`);
  console.log(JSON.stringify(investigation.body, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
