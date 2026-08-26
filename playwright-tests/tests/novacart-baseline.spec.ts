import { expect, test } from '@playwright/test';
import { attachEvidenceCapture, writeFailureEvidence } from '../helpers/evidence';

const PRODUCT_NAME = 'NovaBook Pro 14';
const CHECKOUT_CUSTOMER = {
  fullName: 'NovaCart Baseline',
  email: 'baseline@example.com',
  address: '100 Demo Drive',
  city: 'Tempe',
  state: 'AZ',
  zipCode: '85281',
};

async function openCatalog(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Explore All Products' })).toBeVisible();
  await expect(page.locator('#catalog').getByTestId('product-card')).toHaveCount(24);
}

async function productCard(page: import('@playwright/test').Page, name = PRODUCT_NAME) {
  return page.locator('#catalog').getByTestId('product-card').filter({ hasText: name }).first();
}

async function addProductToCart(page: import('@playwright/test').Page, name = PRODUCT_NAME) {
  const card = await productCard(page, name);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Add to Cart' }).click();
}

async function fillCheckoutForm(page: import('@playwright/test').Page) {
  await page.getByLabel('Full Name').fill(CHECKOUT_CUSTOMER.fullName);
  await page.getByLabel('Email').fill(CHECKOUT_CUSTOMER.email);
  await page.getByLabel('Address').fill(CHECKOUT_CUSTOMER.address);
  await page.getByLabel('City').fill(CHECKOUT_CUSTOMER.city);
  await page.getByLabel('State').fill(CHECKOUT_CUSTOMER.state);
  await page.getByLabel('ZIP Code').fill(CHECKOUT_CUSTOMER.zipCode);
}

test.describe('NovaCart green baseline', () => {
  test('catalog loads and search by product name filters results', async ({ page }) => {
    await openCatalog(page);

    await page.getByLabel('Search').fill(PRODUCT_NAME);

    await expect(page.locator('#catalog').getByTestId('product-card')).toHaveCount(1);
    await expect(page.locator('#catalog').getByRole('heading', { name: PRODUCT_NAME })).toBeVisible();
    await expect(page.getByText('1 products')).toBeVisible();
  });

  test('product detail opens from catalog', async ({ page }) => {
    await openCatalog(page);

    const card = await productCard(page);
    await card.getByRole('button', { name: 'View Details' }).click();

    await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible();
    await expect(page.getByText('SKU:')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Specifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to Cart' })).toBeVisible();
  });

  test('cart supports add, quantity update, and removal', async ({ page }) => {
    await openCatalog(page);
    await addProductToCart(page);

    await page.getByRole('button', { name: /Cart\s*1/ }).click();
    await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
    await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible();

    await page.getByLabel('Quantity').fill('2');
    const cartPanel = page
      .locator('section.panel')
      .filter({ has: page.getByRole('heading', { name: 'Your Cart' }) });
    await expect(cartPanel.getByText('$2,998.00')).toBeVisible();

    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Checkout/ })).toBeDisabled();
  });

  test('successful checkout shows confirmation page', async ({ page }, testInfo) => {
    const { consoleErrors, apiEvents } = attachEvidenceCapture(page);
    let orderStatus: number | undefined;

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

      await expect(page.getByTestId('order-confirmation')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Thanks for your order.' })).toBeVisible();
      await expect(page.getByText(CHECKOUT_CUSTOMER.fullName)).toBeVisible();
      await expect(page.getByText(CHECKOUT_CUSTOMER.email)).toBeVisible();
      await expect(page.getByText(new RegExp(`${PRODUCT_NAME} × 1`))).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue Shopping' })).toBeVisible();
    } catch (error) {
      const testError = error instanceof Error ? error : new Error(String(error));
      await writeFailureEvidence({
        testInfo,
        error: testError,
        consoleErrors,
        apiEvents: Array.from(apiEvents.values()),
        expectedValue: 201,
        actualValue: orderStatus,
      });
      throw testError;
    }
  });
});
