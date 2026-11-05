import { useState } from 'react'
import { CartContext } from './CartContext'

function readStored() {
  try {
    const raw = localStorage.getItem('cart')
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStored)

  function save(next) {
    setItems(next)
    try {
      localStorage.setItem('cart', JSON.stringify(next))
    } catch {
      /* storage unavailable, the cart lasts until refresh */
    }
  }

  function addItem(product) {
    if (product.stock_quantity <= 0) {
      return { ok: false, error: 'This item is out of stock.' }
    }
    if (items.length > 0 && items[0].branch_id !== product.branch_id) {
      return {
        ok: false,
        error: 'Your cart has items from another branch. Clear your cart to shop at this branch.',
      }
    }

    const existing = items.find((i) => i.id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        return { ok: false, error: `Only ${product.stock_quantity} available.` }
      }
      save(
        items.map((i) =>
          i.id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                stock_quantity: product.stock_quantity,
                price_pesewas: product.price_pesewas,
              }
            : i
        )
      )
      return { ok: true }
    }

    save([
      ...items,
      {
        id: product.id,
        branch_id: product.branch_id,
        name: product.name,
        price_pesewas: product.price_pesewas,
        stock_quantity: product.stock_quantity,
        quantity: 1,
      },
    ])
    return { ok: true }
  }

  function setQuantity(id, quantity) {
    save(
      items.map((i) => {
        if (i.id !== id) return i
        const clamped = Math.max(1, Math.min(quantity, i.stock_quantity))
        return { ...i, quantity: clamped }
      })
    )
  }

  function removeItem(id) {
    save(items.filter((i) => i.id !== id))
  }

  function clearCart() {
    save([])
  }

  const value = {
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPesewas: items.reduce((sum, i) => sum + i.price_pesewas * i.quantity, 0),
    addItem,
    setQuantity,
    removeItem,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}