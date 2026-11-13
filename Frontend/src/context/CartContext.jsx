/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartQuantity as apiUpdateCartQuantity,
  removeFromCart as apiRemoveFromCart,
} from "../services/cartService";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);

  // Compute total count from cart items
  const computeCount = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  // Fetch cart data from backend
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      setCartCount(0);
      return [];
    }

    setCartLoading(true);
    try {
      const data = await getCart();
      const items = Array.isArray(data?.items) ? data.items : [];
      setCartItems(items);
      setCartCount(computeCount(items));
      return items;
    } catch (err) {
      console.warn("Failed to retrieve user cart:", err);
      return [];
    } finally {
      setCartLoading(false);
    }
  }, [isAuthenticated]);

  // Synchronize cart on session state changes
  useEffect(() => {
    let isMounted = true;

    if (!authLoading) {
      if (isAuthenticated) {
        getCart()
          .then((data) => {
            if (!isMounted) return;
            const items = Array.isArray(data?.items) ? data.items : [];
            setCartItems(items);
            setCartCount(computeCount(items));
          })
          .catch((err) => {
            console.warn("Failed to synchronize cart:", err);
          });
      } else {
        Promise.resolve().then(() => {
          if (!isMounted) return;
          setCartItems([]);
          setCartCount(0);
        });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authLoading]);

  // Add item to cart and refresh state
  const addToCartItem = async ({ productId, variantId = null, quantity = 1 }) => {
    const response = await apiAddToCart({ productId, variantId, quantity });
    await fetchCart();
    return response;
  };

  // Update item quantity in cart
  const updateQuantity = async (itemId, quantity) => {
    const response = await apiUpdateCartQuantity(itemId, quantity);
    await fetchCart();
    return response;
  };

  // Remove item from cart
  const removeItem = async (itemId) => {
    const response = await apiRemoveFromCart(itemId);
    await fetchCart();
    return response;
  };

  // Clear entire cart by deleting all current items
  const clearCart = async () => {
    const currentItems = [...cartItems];
    for (const item of currentItems) {
      try {
        await apiRemoveFromCart(item.id);
      } catch (err) {
        console.warn(`Failed to remove item ${item.id} during clearCart:`, err);
      }
    }
    await fetchCart();
  };

  const value = {
    cartItems,
    cartCount,
    cartLoading,
    fetchCart,
    addToCartItem,
    updateQuantity,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export default CartContext;
