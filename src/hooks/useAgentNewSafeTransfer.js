'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return url.replace(/^http/, 'ws');
};

/**
 * Listen for new Safe Transfer work for agents. Backend emits `new_safe_transfer` to `user:${userId}`.
 * @param {string|null} token — JWT
 * @param {{ enabled?: boolean, onNew?: () => void }} options
 */
export function useAgentNewSafeTransfer(token, options = {}) {
  const { enabled = true, onNew } = options;
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    if (!token || !enabled) return undefined;

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('new_safe_transfer', () => {
      if (typeof onNewRef.current === 'function') {
        onNewRef.current();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, enabled]);
}
