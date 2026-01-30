'use client';

import { useState, useEffect } from 'react';
import { fetchGamesTree } from '@/lib/api';

export function useGames() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchGamesTree()
      .then((data) => {
        if (!cancelled) {
          setTree(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load games');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { tree, games: tree?.games ?? [], loading, error };
}
