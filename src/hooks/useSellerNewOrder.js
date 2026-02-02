'use client';

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return url.replace(/^http/, 'ws');
};

/**
 * Connect to app socket and listen for:
 * - 'new_order': seller notification when someone buys.
 * - 'order_activity': order changed (e.g. new message) so badges can refresh.
 * options.onOrderActivity: () => void — called when order_activity is received (e.g. refetch unread count).
 * Returns { lastNewOrder, clearNewOrder }.
 */
export function useSellerNewOrder(token, options = {}) {
  const { onOrderActivity } = options;
  const [lastNewOrder, setLastNewOrder] = useState(null);
  const socketRef = useRef(null);
  const onOrderActivityRef = useRef(onOrderActivity);
  onOrderActivityRef.current = onOrderActivity;

  useEffect(() => {
    if (!token) {
      setLastNewOrder(null);
      return;
    }
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    socket.on('new_order', (payload) => {
      setLastNewOrder(
        payload && typeof payload === 'object'
          ? {
              orderId: payload.orderId,
              offerTitle: payload.offerTitle ?? 'Your offer',
              quantity: payload.quantity ?? 1,
              buyerCharacterNick: payload.buyerCharacterNick ?? null,
            }
          : null
      );
    });
    socket.on('order_activity', () => {
      if (typeof onOrderActivityRef.current === 'function') {
        onOrderActivityRef.current();
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const clearNewOrder = () => setLastNewOrder(null);

  return { lastNewOrder, clearNewOrder };
}
