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
 * - 'order_activity': order changed so badges can refresh (no message sound).
 * - 'new_message': new message received in an order chat (for message sound only).
 * - 'balance_updated': balance changed (e.g. buyer confirmed receipt, money released to seller).
 * options.onOrderActivity: () => void — called when order_activity (e.g. refetch unread).
 * options.onNewMessage: () => void — called when new_message (e.g. play sound + refetch).
 * options.onBalanceUpdated: () => void — called when balance_updated (e.g. refetch /me so balance UI updates immediately).
 * Returns { lastNewOrder, clearNewOrder }.
 */
export function useSellerNewOrder(token, options = {}) {
  const { onOrderActivity, onNewMessage, onBalanceUpdated } = options;
  const [lastNewOrder, setLastNewOrder] = useState(null);
  const socketRef = useRef(null);
  const onOrderActivityRef = useRef(onOrderActivity);
  const onNewMessageRef = useRef(onNewMessage);
  const onBalanceUpdatedRef = useRef(onBalanceUpdated);
  onOrderActivityRef.current = onOrderActivity;
  onNewMessageRef.current = onNewMessage;
  onBalanceUpdatedRef.current = onBalanceUpdated;

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
    socket.on('new_message', () => {
      if (typeof onNewMessageRef.current === 'function') {
        onNewMessageRef.current();
      }
    });
    socket.on('balance_updated', () => {
      if (typeof onBalanceUpdatedRef.current === 'function') {
        onBalanceUpdatedRef.current();
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
