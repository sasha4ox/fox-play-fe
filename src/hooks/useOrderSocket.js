'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return url.replace(/^http/, 'ws');
};

const TYPING_EXPIRE_MS = 4000;

/**
 * Connect to order chat room via Socket.IO. Joins order room when orderId and token are set.
 * Returns { socket, connected, lastMessage, onlineUserIds, typingUserIds, emitTyping, emitTypingStop }.
 * Pass onMessage(msg) to get every received message immediately.
 * Pass onOrderRead(payload) for Telegram-style read receipts: { orderId, userId, lastReadAt }.
 * Pass onOrderActivity(orderId) when order changes (e.g. seller marked delivered) so UI can refetch order + messages.
 */
export function useOrderSocket(orderId, token, options = {}) {
  const { onMessage, onOrderRead, onOrderActivity } = options;
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingUserIds, setTypingUserIds] = useState([]);
  const socketRef = useRef(null);
  const orderIdRef = useRef(orderId);
  const typingTimeoutsRef = useRef({});
  const onMessageRef = useRef(onMessage);
  const onOrderReadRef = useRef(onOrderRead);
  const onOrderActivityRef = useRef(onOrderActivity);
  onMessageRef.current = onMessage;
  onOrderReadRef.current = onOrderRead;
  onOrderActivityRef.current = onOrderActivity;
  orderIdRef.current = orderId;

  useEffect(() => {
    if (!token || !orderId) return;
    setOnlineUserIds([]);
    setLastMessage(null);
    setTypingUserIds([]);
    Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    typingTimeoutsRef.current = {};
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('message', (msg) => {
      setLastMessage(msg);
      onMessageRef.current?.(msg);
    });
    socket.on('order_read', (payload) => {
      if (payload?.orderId === orderId) {
        onOrderReadRef.current?.(payload);
      }
    });
    socket.on('order_activity', (payload) => {
      if (payload?.orderId === orderId) {
        onOrderActivityRef.current?.(payload?.orderId);
      }
    });
    socket.on('presence', (data) => setOnlineUserIds(Array.isArray(data?.userIds) ? data.userIds : []));

    const clearTyping = (userId) => {
      setTypingUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : prev));
      const t = typingTimeoutsRef.current[userId];
      if (t) {
        clearTimeout(t);
        delete typingTimeoutsRef.current[userId];
      }
    };
    socket.on('order_typing', (payload) => {
      if (payload?.orderId !== orderId || !payload?.userId) return;
      const { userId: uid } = payload;
      if (typingTimeoutsRef.current[uid]) {
        clearTimeout(typingTimeoutsRef.current[uid]);
      }
      setTypingUserIds((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
      typingTimeoutsRef.current[uid] = setTimeout(() => clearTyping(uid), TYPING_EXPIRE_MS);
    });
    socket.on('order_typing_stop', (payload) => {
      if (payload?.orderId !== orderId || !payload?.userId) return;
      clearTyping(payload.userId);
    });

    socket.emit('join_order', orderId);
    return () => {
      socket.emit('leave_order', orderId);
      socket.disconnect();
      socketRef.current = null;
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
    };
  }, [orderId, token]);

  const emitTyping = useCallback(() => {
    const id = orderIdRef.current;
    if (id) socketRef.current?.emit('typing', id);
  }, []);
  const emitTypingStop = useCallback(() => {
    const id = orderIdRef.current;
    if (id) socketRef.current?.emit('typing_stop', id);
  }, []);

  return { socket: socketRef.current, connected, lastMessage, onlineUserIds, typingUserIds, emitTyping, emitTypingStop };
}
