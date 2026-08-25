const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function parseResponse(response) {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`);
  return parseResponse(response);
}

export async function fetchProducts() {
  const response = await fetch(`${API_BASE_URL}/api/v1/products`);
  return parseResponse(response);
}

export async function fetchProductById(productId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}`);
  return parseResponse(response);
}
