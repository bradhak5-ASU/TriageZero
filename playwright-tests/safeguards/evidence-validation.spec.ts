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

  for (const scenarioId of [
    'checkout_500',
    'wrong_total',
    'frontend_render_failure',
    'slow_confirmation',
    'dependency_unavailable',
    'broken_test_locator',
  ]) {
    test(`rejects scenario label ${scenarioId} inside outbound evidence`, () => {
      expect(() =>
        validateEvidenceForAI({
          failure: {
            message: `Failure captured while running ${scenarioId}.`,
          },
        })
      ).toThrow(new RegExp(scenarioId));
    });
  }

  test('rejects scenario labels inside nested values with normalized casing', () => {
    expect(() =>
      validateEvidenceForAI({
        failure: {
          details: ['The Wrong Total mode changed the value.'],
        },
      })
    ).toThrow(/wrong_total/);
  });
});
