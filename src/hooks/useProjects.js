import { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api/projects.api';

export function useProjects(params = {}) {
  const [projects,   setProjects]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const fetch = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await projectsApi.getAll({ ...params, ...overrides });
      setProjects(data.data);
      console.log(data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetch(); }, []); // eslint-disable-line

  const refresh = () => fetch();

  return { projects, pagination, loading, error, refresh, fetch };
}

export function useProjectStats() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.getStats()
      .then(({ data }) => setStats(data.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
