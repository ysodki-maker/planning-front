import { useState, useEffect } from 'react';
import { usersApi } from '../api/users.api';

export function useUsers() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await usersApi.getAll({ limit: 100, ...params });
      setUsers(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return { users, loading, error, refresh: fetch };
}
