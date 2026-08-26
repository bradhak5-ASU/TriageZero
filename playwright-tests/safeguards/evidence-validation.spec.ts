import { expect, test } from '@playwright/test';
import { validateEvidenceForAI } from '../helpers/evidence';

test.describe('AI evidence validation safeguard', () => {
  test('allows clean investigation evidence', () => {
    expect(() =>
      validateEvidenceForAI({
        testName: 'successful checkout shows confirmation page',
        expectedResult: 'Order request should return HTTP 201.',
        actualResult: 'Order request returned HTTP 500.',
        failedApiRequests: [
          {
            method: 'POST',
            url: 'http://localhost:8000/api/v1/orders',
            status: 500,
          },
        ],
      })
    ).not.toThrow();
  });

  test('rejects expected classification metadata', () => {
    expect(() =>
      validateEvidenceForAI({
        expected_classification: 'backend_application_defect',
      })
    ).toThrow(/expected_classification/);
  });

  test('rejects defect scenario metadata', () => {
    expect(() =>
      validateEvidenceForAI({
        defect_scenario: 'example',
      })
    ).toThrow(/defect_scenario/);
  });

  test('rejects scenario labels inside string values', () => {
    expect(() =>
      validateEvidenceForAI({
        errorMessage: 'Order failed while running checkout_500.',
      })
    ).toThrow(/checkout_500/);
  });
});
