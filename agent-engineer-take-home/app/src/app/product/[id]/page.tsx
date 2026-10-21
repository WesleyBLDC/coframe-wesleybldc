import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/products';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const stars = '★'.repeat(Math.round(product.rating)) + '☆'.repeat(5 - Math.round(product.rating));

  return (
    <>
      <p className="breadcrumb"><a href="/">All TVs</a> › {product.brand} {product.model}</p>

      <div className="pdp-layout">
        <div className="pdp-main">
          <div className="pdp-image" />
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#888', marginTop: 20, display: 'block' }}>{product.brand}</span>
          <h2 style={{ marginTop: 4 }}>{product.name}</h2>

          <p style={{ fontSize: 13, color: '#555', margin: '4px 0 20px' }}>
            {stars} {product.rating} · {product.reviewCount.toLocaleString()} reviews
          </p>

          <p className="section-title">Why buy this TV</p>
          <ul className="highlights-list">
            {product.highlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>

          <p className="section-title">Specifications</p>
          <table className="specs-table">
            <tbody>
              <tr><td>Screen size</td><td>{product.size}"</td></tr>
              <tr><td>Display type</td><td>{product.displayType}</td></tr>
              <tr><td>Resolution</td><td>{product.resolution}</td></tr>
              <tr><td>Refresh rate</td><td>{product.refreshRate}Hz</td></tr>
              <tr><td>HDR formats</td><td>{product.hdr.join(', ')}</td></tr>
              <tr><td>Smart platform</td><td>{product.smartPlatform}</td></tr>
              <tr><td>HDMI ports</td><td>{product.ports.hdmi}x HDMI</td></tr>
              <tr><td>USB ports</td><td>{product.ports.usb}x USB</td></tr>
            </tbody>
          </table>

          <p className="section-title">Customer reviews</p>
          <div className="rating-summary">
            <span className="rating-big">{product.rating}</span>
            <span className="rating-meta">out of 5 · {product.reviewCount.toLocaleString()} reviews</span>
          </div>
          <div className="review-list">
            {product.reviews.map((r, i) => (
              <div key={i} className="review-card">
                <div className="review-header">
                  <span className="author">{r.author}</span>
                  <span className="review-rating">{'★'.repeat(r.rating)}</span>
                </div>
                <div className="review-date">{r.date}</div>
                <p className="review-text">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pdp-sidebar">
          <p className="price">${product.price.toLocaleString()}</p>
          <p className="delivery-info">
            {product.inStock
              ? `Free delivery in ${product.deliveryDays} day${product.deliveryDays > 1 ? 's' : ''}`
              : 'Out of stock'}
          </p>
          <p className="stock-info">
            {product.quantityAvailable > 20
              ? 'In stock'
              : `Only ${product.quantityAvailable} left in stock`}
          </p>
          <button className="buy-btn">Add to cart</button>
        </div>
      </div>
    </>
  );
}
