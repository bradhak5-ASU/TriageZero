import { useEffect, useMemo, useState } from 'react';
import { fetchProductById, fetchProducts } from './services/api';
import './styles.css';

function currency(value) {
  return `$${value.toFixed(2)}`;
}

function Navbar({ cartCount, onNavigate }) {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <button className="btn btn-secondary" onClick={() => onNavigate('home')}>
          <span className="brand">NovaCart</span>
        </button>
        <nav className="nav-links">
          <button className="btn btn-secondary nav-link" onClick={() => onNavigate('home')}>
            Products
          </button>
          <button className="cart-pill" onClick={() => onNavigate('cart')}>
            Cart
            <strong>{cartCount}</strong>
          </button>
        </nav>
      </div>
    </header>
  );
}

function Home({ products, loading, error, onViewDetails, onAddToCart, onShopClick }) {
  return (
    <div className="container">
      <section className="hero">
        <h1>Upgrade your setup.</h1>
        <p>
          Discover carefully selected laptops, displays, audio gear, and accessories.
        </p>
        <button className="btn btn-primary" onClick={onShopClick}>Shop Products</button>
      </section>

      <h2 className="section-title">Featured Technology</h2>

      {loading && <div className="state-card">Loading products…</div>}
      {error && <div className="state-card">We couldn’t load products right now.</div>}

      {!loading && !error && (
        <section className="product-grid">
          {products.map((product) => (
            <article key={product.id} className="product-card">
              <img className="product-image" src={product.image_url} alt={product.name} />
              <div className="product-content">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-desc">{product.description}</p>
                <div className="meta-row">
                  <span className="price">{currency(product.price)}</span>
                  <span className="stock">In stock: {product.stock}</span>
                </div>
                <div className="card-actions">
                  <button className="btn btn-primary" onClick={() => onAddToCart(product)}>
                    Add to Cart
                  </button>
                  <button className="btn btn-secondary" onClick={() => onViewDetails(product.id)}>
                    View Details
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function ProductDetails({ productId, onBack, onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchProductById(productId)
      .then((data) => setProduct(data))
      .catch(() => setError('Product details unavailable.'))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <div className="container state-card">Loading product details…</div>;
  if (error || !product) return <div className="container state-card">{error || 'Not found.'}</div>;

  return (
    <div className="container layout">
      <button className="btn btn-secondary" onClick={onBack}>← Back to Products</button>
      <section className="product-detail">
        <img src={product.image_url} alt={product.name} />
        <div>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <p className="price">{currency(product.price)}</p>
          <p className="stock">Available: {product.stock}</p>
          <div className="field">
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              type="number"
              min="1"
              max={product.stock}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <button className="btn btn-primary" onClick={() => onAddToCart(product, qty)}>
            Add to Cart
          </button>
        </div>
      </section>
    </div>
  );
}

function Cart({ cartItems, onBack, onRemove, onUpdateQty, onCheckout }) {
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  return (
    <div className="container layout">
      <button className="btn btn-secondary" onClick={onBack}>← Continue Shopping</button>
      <div className="cart-layout">
        <section className="panel">
          <h2>Cart</h2>
          {cartItems.length === 0 ? (
            <div className="state-card">Your cart is empty.</div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image_url} alt={item.name} />
                <div>
                  <h3>{item.name}</h3>
                  <p>{currency(item.price)}</p>
                  <div className="field">
                    <label htmlFor={`qty-${item.id}`}>Quantity</label>
                    <input
                      id={`qty-${item.id}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateQty(item.id, Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                </div>
                <button className="btn btn-secondary" onClick={() => onRemove(item.id)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </section>

        <aside className="panel">
          <h2>Order Summary</h2>
          <p>Subtotal: {currency(subtotal)}</p>
          <p><strong>Total: {currency(subtotal)}</strong></p>
          <button className="btn btn-primary" disabled={!cartItems.length} onClick={onCheckout}>
            Checkout
          </button>
        </aside>
      </div>
    </div>
  );
}

function Checkout({ cartItems, onBack, onPlaceOrder }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  function submit(event) {
    event.preventDefault();
    if (!name.trim() || !email.includes('@')) {
      setError('Enter a valid name and email.');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      onPlaceOrder({ name: name.trim(), email: email.trim(), total });
      setLoading(false);
    }, 650);
  }

  return (
    <div className="container layout">
      <button className="btn btn-secondary" onClick={onBack}>← Back to Cart</button>
      <div className="checkout-grid">
        <form className="panel" onSubmit={submit}>
          <h2>Customer Information</h2>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Placing order…' : 'Place Order'}
          </button>
        </form>

        <aside className="panel">
          <h2>Order Summary</h2>
          {cartItems.map((item) => (
            <p key={item.id}>{item.name} × {item.quantity}</p>
          ))}
          <p><strong>Total: {currency(total)}</strong></p>
        </aside>
      </div>
    </div>
  );
}

function Confirmation({ order, onContinue }) {
  return (
    <div className="container layout">
      <section className="panel">
        <h2>Order Confirmed</h2>
        <p>Order number: <strong>{order.orderNumber}</strong></p>
        <p>Customer: {order.customer.name} ({order.customer.email})</p>
        <p>Status: Processing</p>
        <h3>Products</h3>
        {order.items.map((item) => (
          <p key={item.id}>{item.name} × {item.quantity}</p>
        ))}
        <p><strong>Total: {currency(order.total)}</strong></p>
        <button className="btn btn-primary" onClick={onContinue}>Continue Shopping</button>
      </section>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('home');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .then((data) => setProducts(data))
      .catch(() => setError('Unable to load products'))
      .finally(() => setLoading(false));
  }, []);

  function addToCart(product, quantity = 1) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  }

  function updateQty(productId, quantity) {
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity } : item))
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }

  function placeOrder(customer) {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setOrder({
      orderNumber: `NC-${Date.now().toString().slice(-6)}`,
      customer,
      items: cart,
      total,
    });
    setCart([]);
    setView('confirmation');
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Navbar cartCount={cartCount} onNavigate={setView} />
      {view === 'home' && (
        <Home
          products={products}
          loading={loading}
          error={error}
          onViewDetails={(id) => {
            setSelectedProductId(id);
            setView('details');
          }}
          onAddToCart={addToCart}
          onShopClick={() => document.querySelector('.section-title')?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}
      {view === 'details' && selectedProductId && (
        <ProductDetails
          productId={selectedProductId}
          onBack={() => setView('home')}
          onAddToCart={addToCart}
        />
      )}
      {view === 'cart' && (
        <Cart
          cartItems={cart}
          onBack={() => setView('home')}
          onRemove={removeItem}
          onUpdateQty={updateQty}
          onCheckout={() => setView('checkout')}
        />
      )}
      {view === 'checkout' && (
        <Checkout
          cartItems={cart}
          onBack={() => setView('cart')}
          onPlaceOrder={placeOrder}
        />
      )}
      {view === 'confirmation' && order && (
        <Confirmation order={order} onContinue={() => setView('home')} />
      )}
    </>
  );
}
