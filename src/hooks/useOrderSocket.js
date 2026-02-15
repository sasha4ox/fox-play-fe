'use client';

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return url.replace(/^http/, 'ws');
};

/**
 * Connect to order chat room via Socket.IO. Joins order room when orderId and token are set.
 * Returns { socket, connected, lastMessage, onlineUserIds }.
 * Pass onMessage(msg) to get every received message immediately.
 * Pass onOrderRead(payload) for Telegram-style read receipts: { orderId, userId, lastReadAt }.
 */
export function useOrderSocket(orderId, token, options = {}) {
  const { onMessage, onOrderRead } = options;
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const socketRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const onOrderReadRef = useRef(onOrderRead);
  onMessageRef.current = onMessage;
  onOrderReadRef.current = onOrderRead;

  useEffect(() => {
    if (!token || !orderId) return;
    setOnlineUserIds([]);
    setLastMessage(null);
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
    socket.on('presence', (data) => setOnlineUserIds(Array.isArray(data?.userIds) ? data.userIds : []));
    socket.emit('join_order', orderId);
    return () => {
      socket.emit('leave_order', orderId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId, token]);

  return { socket: socketRef.current, connected, lastMessage, onlineUserIds };
}
