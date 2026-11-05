import { Link } from 'react-router-dom'
import { useCart } from '../useCart'
import { formatPrice } from '../formatPrice'

export default function Cart() {
  const { items, totalPesewas, setQuantity, removeItem, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div>
        <h1>Your cart</h1>
        <p className="message">Your cart is empty.</p>
        <Link to="/" className="btn btn-primary">
          Browse products
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1>Your cart</h1>

      <ul className="cart-list">
        {items.map((item) => (
          <li key={item.id} className="cart-row">
            <div>
              <p className="cart-item-name">{item.name}</p>
              <p className="cart-item-price">{formatPrice(item.price_pesewas)} each</p>
            </div>

            <div className="qty-controls">
              <button
                type="button"
                className="qty-btn"
                aria-label={`Decrease quantity of ${item.name}`}
                onClick={() => setQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                -
              </button>
              <span className="qty-value">{item.quantity}</span>
              <button
                type="button"
                className="qty-btn"
                aria-label={`Increase quantity of ${item.name}`}
                onClick={() => setQuantity(item.id, item.quantity + 1)}
                disabled={item.quantity >= item.stock_quantity}
              >
                +
              </button>
            </div>

            <p className="cart-line-total">{formatPrice(item.price_pesewas * item.quantity)}</p>

            <button type="button" className="btn btn-secondary" onClick={() => removeItem(item.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="cart-summary">
        <p className="cart-total">Total: {formatPrice(totalPesewas)}</p>
               <div className="cart-actions">
          <button type="button" className="btn btn-secondary" onClick={clearCart}>
            Clear cart
          </button>
          <Link to="/checkout" className="btn btn-primary">
            Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}