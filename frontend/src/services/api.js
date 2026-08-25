const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function parseResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || `Request failed: ${response.status}`);
  }
  return data;
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`);
  return parseResponse(response);
}

export async function fetchCategories() {
  const response = await fetch(`${API_BASE_URL}/api/v1/categories`);
  return parseResponse(response);
}

export async function fetchProducts(params = {}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/products${buildQuery(params)}`);
  return parseResponse(response);
}

export async function fetchProductById(productId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}`);
  return parseResponse(response);
}

export async function createOrder(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}
