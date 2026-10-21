import type { TemplateProps } from './types';
import { Empty, Reason, money } from './shared';

// Illustrative volume tiers; products.json carries no discount data.
function discountRate(quantity: number): number {
  if (quantity >= 25) return 0.15;
  if (quantity >= 10) return 0.1;
  if (quantity >= 5) return 0.05;
  return 0;
}

// Procurement view: unit price, volume discount, order total, and whether stock covers the order.
export default function Bulk({ products, context }: TemplateProps) {
  const qty = context.quantity;
  const rate = discountRate(qty);
  return (
    <>
      <h1>Volume quote for {qty} {qty === 1 ? 'unit' : 'units'}</h1>
      <Reason text={context.reason} />
      {products.length === 0 ? <Empty /> : (
        <>
          {rate > 0 && <p className="tpl-badge bulk-tier">{Math.round(rate * 100)}% volume discount applied at {qty} units</p>}
          <div className="compare-scroll">
            <table className="specs-table bulk-table">
              <thead>
                <tr>
                  <th>TV</th>
                  <th>Unit price</th>
                  <th>Your unit price</th>
                  <th>Total for {qty}</th>
                  <th>Stock</th>
                  <th>Delivery</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const unit = p.price * (1 - rate);
                  const short = p.quantityAvailable < qty;
                  return (
                    <tr key={p.id}>
                      <td><a href={`/product/${p.id}`}>{p.name}</a></td>
                      <td className={rate > 0 ? 'bulk-was' : undefined}>{money(p.price)}</td>
                      <td>{money(unit)}</td>
                      <td className="bulk-total">{money(unit * qty)}</td>
                      <td className={short ? 'bulk-short' : 'bulk-ok'}>
                        {short ? `Only ${p.quantityAvailable} available` : `${p.quantityAvailable} available`}
                      </td>
                      <td>{p.deliveryDays} day{p.deliveryDays > 1 ? 's' : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="stock-info">Volume pricing is an estimate (5+ units 5%, 10+ 10%, 25+ 15%) and is confirmed at checkout.</p>
        </>
      )}
    </>
  );
}
