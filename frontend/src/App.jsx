import { useEffect, useMemo, useState } from 'react';
import {
  createOrder,
  fetchCategories,
  fetchHealth,
  fetchProductById,
  fetchProducts,
} from './services/api';
import './styles.css';

const DEFAULT_CHECKOUT = {
  full_name: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
};

function currency(value) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function stockLabel(stock) {
  if (stock === 0) return 'Out of Stock';
  if (stock <= 10) return `Only ${stock} left`;
  return 'In Stock';
}

function stockTone(stock) {
  if (stock === 0) return 'danger';
  if (stock <= 10) return 'warn';
  return 'success';
}

function scrollToSection(id) {
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

function Navbar({ cartCount, onNavigate }) {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <button className="brand-button" onClick={() => onNavigate('home')} data-testid="home-button">
          <span className="brand-mark">N</span>
          <span className="brand-text">NovaCart</span>
        </button>

        <nav className="nav-links">
          <button className="nav-link" onClick={() => onNavigate('home', 'catalog')}>
            Products
          </button>
          <button className="nav-link" onClick={() => onNavigate('home', 'featured')}>
            Featured
          </button>
          <button className="cart-button" onClick={() => onNavigate('cart')} data-testid="cart-button">
            Cart
            <span className="cart-count">{cartCount}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

function Hero({ backendStatus, onShopProducts, onBrowseFeatured }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Database-driven electronics store</p>
        <h1>Technology for work, play, and everything between.</h1>
        <p>
          Discover laptops, displays, audio, accessories, and workspace essentials selected for
          modern setups.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onShopProducts}>
            Shop Products
          </button>
          <button className="btn btn-secondary" onClick={onBrowseFeatured}>
            Browse Featured
          </button>
        </div>
      </div>
      <aside className="hero-panel">
        <span className={`status-pill status-${backendStatus === 'ok' ? 'success' : 'warn'}`}>
          Backend status: {backendStatus}
        </span>
        <ul className="hero-points">
          <li>Products and categories come from PostgreSQL.</li>
          <li>Search, sort, cart, checkout, and order confirmation are live.</li>
          <li>Local product assets keep demos reliable inside Docker.</li>
        </ul>
      </aside>
    </section>
  );
}

function SectionHeader({ title, description, id }) {
  return (
    <div className="section-header" id={id}>
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

function CategoryChips({ categories, selectedCategory, onSelectCategory }) {
  return (
    <section className="section-shell">
      <SectionHeader
        title="Shop by Category"
        description="Browse categories sourced from the backend."
      />
      <div className="category-row">
        <button
          className={`category-chip ${selectedCategory === '' ? 'active' : ''}`}
          onClick={() => onSelectCategory('')}
          data-testid="category-filter"
        >
          All Products
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => onSelectCategory(category)}
            data-testid="category-filter"
          >
            {category}
          </button>
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, onAddToCart, onViewDetails }) {
  const originalPrice = product.original_price && product.original_price > product.price ? product.original_price : null;
  const tone = stockTone(product.stock);

  return (
    <article className="product-card" data-testid="product-card">
      <img className="product-image" src={product.image_url} alt={product.name} loading="lazy" />
      <div className="product-content">
        <div className="product-topline">
          <span className="brand-chip">{product.brand}</span>
          {product.featured ? <span className="featured-chip">Featured</span> : null}
        </div>
        <h3 className="product-name" data-testid="product-name">
          {product.name}
        </h3>
        <p className="product-desc">{product.short_description}</p>

        <div className="rating-row" aria-label={`${product.rating} stars from ${product.review_count} reviews`}>
          <span className="rating-value">★ {product.rating.toFixed(1)}</span>
          <span className="review-count">({product.review_count} reviews)</span>
        </div>

        <div className="price-row">
          <div>
            <span className="product-price" data-testid="product-price">
              {currency(product.price)}
            </span>
            {originalPrice ? <span className="original-price">{currency(originalPrice)}</span> : null}
          </div>
          <span className={`stock-pill stock-${tone}`}>{stockLabel(product.stock)}</span>
        </div>

        <div className="card-actions">
          <button
            className="btn btn-primary"
            onClick={() => onAddToCart(product)}
            disabled={product.stock === 0}
            data-testid="add-to-cart"
          >
            Add to Cart
          </button>
          <button className="btn btn-secondary" onClick={() => onViewDetails(product.id)}>
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

function FeaturedProducts({ products, loading, error, onAddToCart, onViewDetails }) {
  return (
    <section className="section-shell featured-shell">
      <SectionHeader
        title="Featured Products"
        description="Best-selling picks and highlighted workspace essentials."
        id="featured"
      />
      {loading ? <div className="state-card">Loading featured products…</div> : null}
      {error ? <div className="state-card error-card">{error}</div> : null}
      {!loading && !error && products.length > 0 ? (
        <div className="product-grid compact-grid">
          {products.slice(0, 6).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Catalog({ products, loading, error, categories, selectedCategory, search, sort, onSearch, onSort, onSelectCategory, onAddToCart, onViewDetails }) {
  return (
    <section className="section-shell catalog-shell" id="catalog">
      <SectionHeader
        title="Explore All Products"
        description="Search, filter, and sort the full catalog without leaving the page."
      />

      <div className="filters-bar">
        <label className="field inline-field">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search products, brands, or SKUs"
            data-testid="product-search"
          />
        </label>

        <label className="field inline-field">
          <span>Category</span>
          <select value={selectedCategory} onChange={(event) => onSelectCategory(event.target.value)}>
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="field inline-field">
          <span>Sort</span>
          <select value={sort} onChange={(event) => onSort(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Rating</option>
          </select>
        </label>
      </div>

      <div className="catalog-summary">
        <span>{loading ? 'Loading products…' : `${products.length} products`}</span>
      </div>

      {error ? <div className="state-card error-card">{error}</div> : null}
      {!loading && !error && products.length === 0 ? (
        <div className="state-card">No products match your filters.</div>
      ) : null}
      {!error && products.length > 0 ? (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ProductDetails({ productId, onBack, onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchProductById(productId)
      .then((data) => {
        if (active) {
          setProduct(data);
          setQuantity(1);
        }
      })
      .catch(() => {
        if (active) setError('Product details unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) return <div className="container state-card">Loading product details…</div>;
  if (error || !product) return <div className="container state-card error-card">{error || 'Not found.'}</div>;

  const originalPrice = product.original_price && product.original_price > product.price ? product.original_price : null;

  return (
    <div className="container detail-page">
      <button className="btn btn-secondary back-button" onClick={onBack}>
        ← Back to Products
      </button>

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button onClick={onBack}>Home</button>
        <span>/</span>
        <button onClick={onBack}>{product.category}</button>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <section className="detail-layout">
        <div className="detail-media">
          <img src={product.image_url} alt={product.name} />
        </div>

        <div className="detail-copy">
          <div className="product-topline">
            <span className="brand-chip">{product.brand}</span>
            <span className={`stock-pill stock-${stockTone(product.stock)}`}>{product.availability}</span>
          </div>
          <h2>{product.name}</h2>
          <p className="detail-short">{product.short_description}</p>

          <div className="rating-row">
            <span className="rating-value">★ {product.rating.toFixed(1)}</span>
            <span className="review-count">({product.review_count} reviews)</span>
          </div>

          <div className="price-stack">
            <span className="detail-price">{currency(product.price)}</span>
            {originalPrice ? <span className="original-price">{currency(originalPrice)}</span> : null}
          </div>

          <p className="sku-line">
            SKU: <strong>{product.sku}</strong>
          </p>

          <div className="field quantity-field">
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              type="number"
              min="1"
              max={product.stock || 1}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            />
          </div>

          <div className="card-actions">
            <button
              className="btn btn-primary"
              onClick={() => onAddToCart(product, quantity)}
              disabled={product.stock === 0}
              data-testid="add-to-cart"
            >
              Add to Cart
            </button>
            <button className="btn btn-secondary" onClick={onBack}>
              Continue Shopping
            </button>
          </div>
        </div>
      </section>

      <section className="info-grid">
        <article className="panel">
          <h3>Specifications</h3>
          <dl className="spec-list">
            {Object.entries(product.specifications || {}).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="panel">
          <h3>Shipping &amp; Returns</h3>
          <p>Free standard shipping on every order. Returns are accepted within 30 days of delivery.</p>
          <p>Demo checkout only. No real payment information is collected.</p>
        </article>
      </section>
    </div>
  );
}

function CartView({ cartItems, onBack, onRemove, onUpdateQty, onCheckout }) {
  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

  return (
    <div className="container flow-page">
      <button className="btn btn-secondary back-button" onClick={onBack}>
        ← Continue Shopping
      </button>

      <div className="cart-layout">
        <section className="panel">
          <h2>Your Cart</h2>
          {cartItems.length === 0 ? (
            <div className="state-card">Your cart is empty.</div>
          ) : (
            cartItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image_url} alt={item.name} />
                <div className="cart-item-copy">
                  <span className="brand-chip">{item.brand}</span>
                  <h3>{item.name}</h3>
                  <p className="sku-line">SKU: {item.sku}</p>
                  <p>{currency(item.price)} each</p>
                  <div className="field quantity-field">
                    <label htmlFor={`qty-${item.id}`}>Quantity</label>
                    <input
                      id={`qty-${item.id}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => onUpdateQty(item.id, Math.max(1, Number(event.target.value) || 1))}
                    />
                  </div>
                </div>
                <div className="cart-item-meta">
                  <strong>{currency(item.price * item.quantity)}</strong>
                  <button className="btn btn-secondary" onClick={() => onRemove(item.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <aside className="panel">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{currency(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>Free</strong>
          </div>
          <div className="summary-row total-row">
            <span>Estimated Total</span>
            <strong>{currency(subtotal)}</strong>
          </div>
          <button
            className="btn btn-primary checkout-button"
            onClick={onCheckout}
            disabled={cartItems.length === 0}
            data-testid="checkout-button"
          >
            Checkout
          </button>
        </aside>
      </div>
    </div>
  );
}

function CheckoutView({ cartItems, checkoutData, onBack, onUpdateField, onPlaceOrder, loading, error }) {
  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

  return (
    <div className="container flow-page">
      <button className="btn btn-secondary back-button" onClick={onBack}>
        ← Back to Cart
      </button>

      <div className="checkout-grid">
        <form className="panel" onSubmit={onPlaceOrder}>
          <h2>Checkout</h2>
          <p className="demo-payment">Demo Payment — no real payment information required.</p>

          <div className="field">
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              value={checkoutData.full_name}
              onChange={(event) => onUpdateField('full_name', event.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={checkoutData.email}
              onChange={(event) => onUpdateField('email', event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              value={checkoutData.address}
              onChange={(event) => onUpdateField('address', event.target.value)}
              autoComplete="street-address"
            />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                value={checkoutData.city}
                onChange={(event) => onUpdateField('city', event.target.value)}
                autoComplete="address-level2"
              />
            </div>
            <div className="field">
              <label htmlFor="state">State</label>
              <input
                id="state"
                value={checkoutData.state}
                onChange={(event) => onUpdateField('state', event.target.value)}
                autoComplete="address-level1"
              />
            </div>
            <div className="field">
              <label htmlFor="zip_code">ZIP Code</label>
              <input
                id="zip_code"
                value={checkoutData.zip_code}
                onChange={(event) => onUpdateField('zip_code', event.target.value)}
                autoComplete="postal-code"
              />
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="btn btn-primary place-order" type="submit" disabled={loading} data-testid="place-order">
            {loading ? 'Placing Order…' : 'Place Order'}
          </button>
        </form>

        <aside className="panel">
          <h2>Order Summary</h2>
          {cartItems.map((item) => (
            <div className="summary-line" key={item.id}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <strong>{currency(item.price * item.quantity)}</strong>
            </div>
          ))}
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{currency(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>Free</strong>
          </div>
          <div className="summary-row total-row">
            <span>Total</span>
            <strong>{currency(subtotal)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ConfirmationView({ order, onContinue }) {
  return (
    <div className="container flow-page">
      <section className="panel confirmation-card" data-testid="order-confirmation">
        <span className="confirmation-badge">Order Confirmed</span>
        <h2>Thanks for your order.</h2>
        <p>
          Order <strong>{order.order_number}</strong> is now <strong>{order.status}</strong>.
        </p>
        <div className="confirmation-grid">
          <div>
            <h3>Customer</h3>
            <p>{order.customer_name}</p>
            <p>{order.customer_email}</p>
          </div>
          <div>
            <h3>Shipping</h3>
            <p>{order.address || 'Demo shipping address not provided.'}</p>
            <p>
              {[order.city, order.state, order.zip_code].filter(Boolean).join(', ') || 'Standard delivery'}
            </p>
          </div>
        </div>

        <div className="confirmation-items">
          {order.items.map((item) => (
            <div className="summary-line" key={`${item.sku}-${item.product_id}`}>
              <span>
                {item.product_name} × {item.quantity}
              </span>
              <strong>{currency(item.subtotal)}</strong>
            </div>
          ))}
        </div>

        <div className="summary-row total-row">
          <span>Total</span>
          <strong>{currency(order.total)}</strong>
        </div>

        <button className="btn btn-primary" onClick={onContinue}>
          Continue Shopping
        </button>
      </section>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <h3>NovaCart</h3>
          <p>Realistic electronics storefront powered by PostgreSQL and FastAPI.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li>Products</li>
            <li>Laptops</li>
            <li>Accessories</li>
          </ul>
        </div>
        <div>
          <h4>Support</h4>
          <ul>
            <li>Shipping</li>
            <li>Returns</li>
            <li>Contact</li>
          </ul>
        </div>
        <div>
          <h4>About</h4>
          <ul>
            <li>Privacy</li>
            <li>Terms</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [view, setView] = useState('home');
  const [backendStatus, setBackendStatus] = useState('loading');
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [checkoutData, setCheckoutData] = useState(DEFAULT_CHECKOUT);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [featuredRefresh, setFeaturedRefresh] = useState(0);

  useEffect(() => {
    let active = true;

    fetchHealth()
      .then(() => {
        if (active) setBackendStatus('ok');
      })
      .catch(() => {
        if (active) setBackendStatus('offline');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetchCategories()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        if (active) setCategories([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setFeaturedLoading(true);
    setFeaturedError('');

    fetchProducts({ featured: true, sort: 'featured' })
      .then((data) => {
        if (active) setFeaturedProducts(data);
      })
      .catch(() => {
        if (active) setFeaturedError('Unable to load featured products.');
      })
      .finally(() => {
        if (active) setFeaturedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [featuredRefresh]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError('');

    fetchProducts({
      category: selectedCategory || undefined,
      search: search.trim() || undefined,
      sort,
    })
      .then((data) => {
        if (active) setCatalogProducts(data);
      })
      .catch(() => {
        if (active) setCatalogError('Unable to load products.');
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [catalogRefresh, selectedCategory, search, sort]);

  function navigate(target, scrollTarget) {
    setView(target);
    if (target === 'home' && scrollTarget) {
      scrollToSection(scrollTarget);
    } else if (target === 'home') {
      window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    }
  }

  function addToCart(product, quantity = 1) {
    const requestedQuantity = Math.min(Math.max(1, quantity), product.stock || 1);

    setCart((previous) => {
      const existing = previous.find((item) => item.id === product.id);
      if (!existing) {
        return [...previous, { ...product, quantity: requestedQuantity }];
      }

      return previous.map((item) => {
        if (item.id !== product.id) return item;
        const nextQuantity = Math.min(item.quantity + requestedQuantity, product.stock || item.quantity);
        return { ...item, quantity: nextQuantity };
      });
    });
  }

  function updateQty(productId, quantity) {
    setCart((previous) =>
      previous.map((item) =>
        item.id === productId ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock || quantity)) } : item
      )
    );
  }

  function removeItem(productId) {
    setCart((previous) => previous.filter((item) => item.id !== productId));
  }

  function openProduct(productId) {
    setSelectedProductId(productId);
    setView('details');
  }

  async function placeOrder(event) {
    event.preventDefault();
    setCheckoutError('');

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    setCheckoutLoading(true);

    try {
      const response = await createOrder({
        customer: checkoutData,
        items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      });

      setOrder(response);
      setCart([]);
      setCheckoutData(DEFAULT_CHECKOUT);
      setView('confirmation');
      setCatalogRefresh((value) => value + 1);
      setFeaturedRefresh((value) => value + 1);
    } catch (error) {
      setCheckoutError(error.message || 'Unable to place order.');
    } finally {
      setCheckoutLoading(false);
    }
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <>
      <Navbar cartCount={cartCount} onNavigate={navigate} />

      {view === 'home' ? (
        <main className="container">
          <Hero
            backendStatus={backendStatus}
            onShopProducts={() => navigate('home', 'catalog')}
            onBrowseFeatured={() => navigate('home', 'featured')}
          />

          <CategoryChips
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(category) => {
              setSelectedCategory(category);
              scrollToSection('catalog');
            }}
          />

          <FeaturedProducts
            products={featuredProducts}
            loading={featuredLoading}
            error={featuredError}
            onAddToCart={addToCart}
            onViewDetails={openProduct}
          />

          <Catalog
            products={catalogProducts}
            loading={catalogLoading}
            error={catalogError}
            categories={categories}
            selectedCategory={selectedCategory}
            search={search}
            sort={sort}
            onSearch={setSearch}
            onSort={setSort}
            onSelectCategory={setSelectedCategory}
            onAddToCart={addToCart}
            onViewDetails={openProduct}
          />
        </main>
      ) : null}

      {view === 'details' && selectedProductId ? (
        <ProductDetails
          productId={selectedProductId}
          onBack={() => navigate('home')}
          onAddToCart={addToCart}
        />
      ) : null}

      {view === 'cart' ? (
        <CartView
          cartItems={cart}
          onBack={() => navigate('home')}
          onRemove={removeItem}
          onUpdateQty={updateQty}
          onCheckout={() => navigate('checkout')}
        />
      ) : null}

      {view === 'checkout' ? (
        <CheckoutView
          cartItems={cart}
          checkoutData={checkoutData}
          onBack={() => navigate('cart')}
          onUpdateField={(field, value) => setCheckoutData((previous) => ({ ...previous, [field]: value }))}
          onPlaceOrder={placeOrder}
          loading={checkoutLoading}
          error={checkoutError}
        />
      ) : null}

      {view === 'confirmation' && order ? (
        <ConfirmationView order={order} onContinue={() => navigate('home', 'catalog')} />
      ) : null}

      <Footer />
    </>
  );
}
