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
 * lastMessage is set when server emits 'message'. onlineUserIds = who is currently in this order chat.
 */
export function useOrderSocket(orderId, token) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !orderId) return;
    setOnlineUserIds([]);
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('message', (msg) => setLastMessage(msg));
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
