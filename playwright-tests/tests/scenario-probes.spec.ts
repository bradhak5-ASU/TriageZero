import { expect, test, type Page } from '@playwright/test';
import { attachEvidenceCapture, writeFailureEvidence } from '../helpers/evidence';

const PRODUCT_NAME = 'NovaBook Pro 14';
const CHECKOUT_CUSTOMER = {
  fullName: 'NovaCart Controlled Check',
  email: 'controlled-check@example.com',
  address: '200 Demo Drive',
  city: 'Tempe',
  state: 'AZ',
  zipCode: '85281',
};
const CONFIRMATION_TIMEOUT_MS = 3000;
const PLACE_ORDER_TEST_ID = 'place-order';

async function openCatalog(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Explore All Products' })).toBeVisible();
}

async function addProductToCart(page: Page) {
  const card = page.locator('#catalog').getByTestId('product-card').filter({ hasText: PRODUCT_NAME }).first();
  await expect(card).toBeVisible();
  const productPrice = parseCurrency(await card.getByTestId('product-price').innerText());
  await card.getByRole('button', { name: 'Add to Cart' }).click();
  return productPrice;
}

async function fillCheckoutForm(page: Page) {
  await page.getByLabel('Full Name').fill(CHECKOUT_CUSTOMER.fullName);
  await page.getByLabel('Email').fill(CHECKOUT_CUSTOMER.email);
  await page.getByLabel('Address').fill(CHECKOUT_CUSTOMER.address);
  await page.getByLabel('City').fill(CHECKOUT_CUSTOMER.city);
  await page.getByLabel('State').fill(CHECKOUT_CUSTOMER.state);
  await page.getByLabel('ZIP Code').fill(CHECKOUT_CUSTOMER.zipCode);
}

function parseCurrency(value: string): number {
  return Number(value.replace(/[^0-9.]/g, ''));
}

function money(value: number): string {
  return value.toFixed(2);
}

test.describe('NovaCart scenario probes', () => {
  test('checkout total matches the purchased item total', async ({ page }, testInfo) => {
    const { consoleErrors, apiEvents } = attachEvidenceCapture(page);
    let expectedTotal: number | undefined;
    let actualTotal: number | undefined;

    try {
      await openCatalog(page);
      expectedTotal = await addProductToCart(page);

      await page.getByRole('button', { name: /Cart\s*1/ }).click();
      await page.getByRole('button', { name: 'Checkout' }).click();
      await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
      await fillCheckoutForm(page);

      const orderResponsePromise = page.waitForResponse(
        (response) => response.url().includes('/api/v1/orders') && response.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Place Order' }).click();
      const orderResponse = await orderResponsePromise;
      expect(orderResponse.status()).toBe(201);

      const confirmation = page.getByTestId('order-confirmation');
      await expect(confirmation).toBeVisible();
      const totalText = await confirmation.locator('.total-row strong').innerText();
      actualTotal = parseCurrency(totalText);

      expect(money(actualTotal)).toBe(money(expectedTotal));
    } catch (error) {
      const testError = error instanceof Error ? error : new Error(String(error));
      await writeFailureEvidence({
        testInfo,
        error: testError,
        consoleErrors,
        apiEvents: Array.from(apiEvents.values()),
        expectedResult: 'The order confirmation total should match the purchased item total.',
        actualResult:
          actualTotal === undefined
            ? 'The order confirmation total was not available.'
            : `The order confirmation total was ${money(actualTotal)}.`,
        expectedValue: expectedTotal === undefined ? undefined : money(expectedTotal),
        actualValue: actualTotal === undefined ? undefined : money(actualTotal),
        includeSuccessfulApiEvents: true,
      });
      throw testError;
    }
  });

  test('confirmation page displays the created order number', async ({ page }, testInfo) => {
    const { consoleErrors, apiEvents } = attachEvidenceCapture(page);
    let orderStatus: number | undefined;
    let orderNumber: string | undefined;

    try {
      await openCatalog(page);
      await addProductToCart(page);

      await page.getByRole('button', { name: /Cart\s*1/ }).click();
      await page.getByRole('button', { name: 'Checkout' }).click();
      await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
      await fillCheckoutForm(page);

      const orderResponsePromise = page.waitForResponse(
        (response) => response.url().includes('/api/v1/orders') && response.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Place Order' }).click();
      const orderResponse = await orderResponsePromise;
      orderStatus = orderResponse.status();
      expect(orderStatus).toBe(201);

      const orderBody = await orderResponse.json();
      orderNumber = orderBody.order_number;

      const confirmation = page.getByTestId('order-confirmation');
      await expect(confirmation).toBeVisible();
      await expect(confirmation.getByText(new RegExp(`Order\\s+${orderNumber}\\b`))).toBeVisible();
    } catch (error) {
      const testError = error instanceof Error ? error : new Error(String(error));
      await writeFailureEvidence({
        testInfo,
        error: testError,
        consoleErrors,
        apiEvents: Array.from(apiEvents.values()),
        expectedResult:
          orderNumber === undefined
            ? 'Checkout should create an order number and show it on the confirmation page.'
            : `Confirmation page should show order number ${orderNumber}.`,
        actualResult:
          orderStatus === undefined
            ? 'Checkout did not return an order response before the confirmation assertion.'
            : `Checkout returned HTTP ${orderStatus}, but the created order number was missing from the confirmation page.`,
        expectedValue: orderNumber === undefined ? 'Created order number visible' : `Order ${orderNumber} visible`,
        actualValue: 'Created order number missing',
        includeSuccessfulApiEvents: true,
      });
      throw testError;
    }
  });

  test('confirmation page appears within the checkout timing budget', async ({ page }, testInfo) => {
    const { consoleErrors, apiEvents } = attachEvidenceCapture(page);
    let orderStatus: number | undefined;
    let observedWaitMs: number | undefined;
    let waitStartedAt = 0;
    let confirmationEventuallyVisible = false;

    try {
      await openCatalog(page);
      await addProductToCart(page);

      await page.getByRole('button', { name: /Cart\s*1/ }).click();
      await page.getByRole('button', { name: 'Checkout' }).click();
      await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
      await fillCheckoutForm(page);

      const orderResponsePromise = page.waitForResponse(
        (response) => response.url().includes('/api/v1/orders') && response.request().method() === 'POST'
      );
      waitStartedAt = Date.now();
      await page.getByRole('button', { name: 'Place Order' }).click();
      const orderResponse = await orderResponsePromise;
      orderStatus = orderResponse.status();
      expect(orderStatus).toBe(201);

      const confirmation = page.getByTestId('order-confirmation');
      await expect(confirmation).toBeVisible({ timeout: CONFIRMATION_TIMEOUT_MS });
      observedWaitMs = Date.now() - waitStartedAt;
      expect(observedWaitMs).toBeLessThanOrEqual(CONFIRMATION_TIMEOUT_MS);
    } catch (error) {
      const testError = error instanceof Error ? error : new Error(String(error));
      if (waitStartedAt !== 0) {
        try {
          await page.getByTestId('order-confirmation').waitFor({ state: 'visible', timeout: 6000 });
          confirmationEventuallyVisible = true;
        } catch {
          confirmationEventuallyVisible = false;
        }
        observedWaitMs = Date.now() - waitStartedAt;
      }
      await writeFailureEvidence({
        testInfo,
        error: testError,
        consoleErrors,
        apiEvents: Array.from(apiEvents.values()),
        expectedResult: `Confirmation page should be visible within ${CONFIRMATION_TIMEOUT_MS} ms after placing the order.`,
        actualResult:
          observedWaitMs === undefined
            ? 'Confirmation page was not observed during checkout.'
            : confirmationEventuallyVisible
              ? `Confirmation page became visible after ${observedWaitMs} ms, beyond the ${CONFIRMATION_TIMEOUT_MS} ms timeout.`
              : `Confirmation page was not visible before the ${CONFIRMATION_TIMEOUT_MS} ms timeout; observed wait was ${observedWaitMs} ms.`,
        expectedValue: `confirmation visible within ${CONFIRMATION_TIMEOUT_MS} ms`,
        actualValue:
          observedWaitMs === undefined
            ? 'confirmation not observed'
            : confirmationEventuallyVisible
              ? `confirmation visible after ${observedWaitMs} ms`
              : `confirmation not visible after ${observedWaitMs} ms`,
        includeSuccessfulApiEvents: true,
      });
      throw testError;
    }
  });

  test('product details load from the product detail service', async ({ page }, testInfo) => {
    const { consoleErrors, apiEvents } = attachEvidenceCapture(page);
    let detailStatus: number | undefined;

    try {
      await openCatalog(page);

      const card = page.locator('#catalog').getByTestId('product-card').filter({ hasText: PRODUCT_NAME }).first();
      await expect(card).toBeVisible();

      const detailResponsePromise = page.waitForResponse(
        (response) => /\/api\/v1\/products\/\d+$/.test(response.url()) && response.request().method() === 'GET'
      );
      await card.getByRole('button', { name: 'View Details' }).click();
      const detailResponse = await detailResponsePromise;
      detailStatus = detailResponse.status();
      expect(detailStatus).toBe(200);

      await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add to Cart' })).toBeVisible();
    } catch (error) {
      const testError = error instanceof Error ? error : new Error(String(error));
      await writeFailureEvidence({
        testInfo,
        error: testError,
        consoleErrors,
        apiEvents: Array.from(apiEvents.values()),
        expectedResult: 'Product details should load successfully from the product detail service.',
        actualResult:
          detailStatus === undefined
            ? 'Product detail response was not received.'
            : `Product detail request returned HTTP ${detailStatus}.`,
        expectedValue: '200',
        actualValue: detailStatus === undefined ? 'no response' : String(detailStatus),
        includeSuccessfulApiEvents: true,
      });
      throw testError;
    }
  });

  test('checkout submit control is available by its expected identifier', async ({ page }, testInfo) => {
    const { consoleErrors, apiEvents } = attachEvidenceCapture(page);
    let buttonVisibleByRole = false;
    let buttonEnabledByRole = false;

    try {
      await openCatalog(page);
      await addProductToCart(page);

      await page.getByRole('button', { name: /Cart\s*1/ }).click();
      await page.getByRole('button', { name: 'Checkout' }).click();
      await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
      await fillCheckoutForm(page);

      const visibleSubmitControl = page.getByRole('button', { name: 'Place Order' });
      await expect(visibleSubmitControl).toBeVisible();
      buttonVisibleByRole = true;
      await expect(visibleSubmitControl).toBeEnabled();
      buttonEnabledByRole = true;

      await expect(page.getByTestId(PLACE_ORDER_TEST_ID)).toBeVisible();
    } catch (error) {
      const testError = error instanceof Error ? error : new Error(String(error));
      await writeFailureEvidence({
        testInfo,
        error: testError,
        consoleErrors,
        apiEvents: Array.from(apiEvents.values()),
        expectedResult: 'Checkout submit control should be available through its expected stable identifier.',
        actualResult:
          buttonVisibleByRole && buttonEnabledByRole
            ? 'The visible Place Order button was present and enabled, but the expected stable identifier did not resolve.'
            : 'The checkout submit control was not available as expected.',
        expectedValue: `${PLACE_ORDER_TEST_ID} visible`,
        actualValue:
          buttonVisibleByRole && buttonEnabledByRole
            ? 'visible enabled Place Order button; expected identifier missing'
            : 'checkout submit control unavailable',
        includeSuccessfulApiEvents: true,
      });
      throw testError;
    }
  });
});
