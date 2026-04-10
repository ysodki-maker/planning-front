import { useState, useCallback } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useUsers }    from '../hooks/useUsers';
import { useAuth }     from '../context/AuthContext';
import { useToast }    from '../context/ToastContext';
import { projectsApi } from '../api/projects.api';

import PageHeader           from '../components/layout/PageHeader';
import ProjectsTable        from '../components/projects/ProjectsTable';
import ProjectForm          from '../components/projects/ProjectForm';
import ConfirmProjectModal  from '../components/projects/ConfirmProjectModal';
import Modal                from '../components/common/Modal';
import Confirm              from '../components/common/Confirm';
import Button               from '../components/common/Button';
import Icon                 from '../components/common/Icon';
import { Select }           from '../components/common/Field';

import { TYPE_LIST, PAGE_SIZE, STATUS_CONFIG } from '../utils/constants';
import styles from './ProjectsPage.module.css';

export default function ProjectsPage() {
  const { isAdmin, user } = useAuth();
  const toast             = useToast();
  const { users }         = useUsers();

  const { projects, pagination, loading, fetch } = useProjects({ limit: PAGE_SIZE });

  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [type,     setType]     = useState('');
  const [page,     setPage]     = useState(1);
  // "Mes projets" : visible pour admin, forcé pour non-admin
  const [myOnly,   setMyOnly]   = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const [showForm,      setShowForm]      = useState(false);
  const [editProject,   setEditProject]   = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Non-admin : le backend filtre automatiquement, pas besoin de passer my=true
  const applyFilters = useCallback((overrides = {}) => {
    const params = { page, limit: PAGE_SIZE, search, status, type, ...overrides };
    // Pour l'admin uniquement : on peut envoyer my=true
    if (isAdmin && myOnly && !('my' in overrides)) params.my = true;
    setPage(params.page ?? page);
    fetch(params);
  }, [page, search, status, type, myOnly, isAdmin, fetch]);

  const handleSearch = (e) => { setSearch(e.target.value); applyFilters({ search: e.target.value, page: 1 }); };
  const handleStatus = (v) => { setStatus(v); applyFilters({ status: v, page: 1 }); };
  const handleType   = (e) => { setType(e.target.value); applyFilters({ type: e.target.value, page: 1 }); };
  const handlePage   = (p) => applyFilters({ page: p });

  const toggleMyOnly = () => {
    const next = !myOnly;
    setMyOnly(next);
    applyFilters({ my: next, page: 1 });
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await projectsApi.create(form);
      toast.success('Projet créé avec succès.');
      setShowForm(false);
      applyFilters({ page: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création.');
    } finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await projectsApi.update(editProject.id, form);
      toast.success('Projet mis à jour.');
      setEditProject(null);
      applyFilters({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projectsApi.delete(deleteTarget.id);
      toast.success('Projet supprimé.');
      setDeleteTarget(null);
      applyFilters({ page: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression.');
    } finally { setDeleting(false); }
  };

  const handleConfirm = async (dateForm) => {
    setConfirming(true);
    try {
      await projectsApi.confirm(confirmTarget.id, dateForm);
      toast.success(`"${confirmTarget.name}" confirmé — passé En cours.`);
      setConfirmTarget(null);
      applyFilters({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la confirmation.');
    } finally { setConfirming(false); }
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className={styles.page}>
      <PageHeader
        // Titre adapté selon le rôle
        title={isAdmin ? 'Projets' : 'Mon planning'}
        subtitle={pagination
          ? isAdmin
            ? `${pagination.total} projet(s) au total`
            : `${pagination.total} projet(s) assigné(s)`
          : ''}
        actions={
          <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={() => setShowForm(true)}>
            Nouveau projet
          </Button>
        }
      />

      {/* ── Chips de filtrage par statut ── */}
      <div className={styles.statsBar}>
        {/* Toggle "Mes projets" — admin uniquement */}
        {isAdmin && (
          <>
            <button
              className={`${styles.statChip} ${myOnly ? styles.statChipActive : ''}`}
              style={{ '--sc': '#6366f1' }}
              onClick={toggleMyOnly}
            >
              <span className={styles.statDot} style={{ background: '#6366f1' }} />
              <span className={styles.statLabel}>Mes projets</span>
            </button>
            <div className={styles.statDivider} />
          </>
        )}

        {/* Chips statut */}
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = projects.filter(p => p.status === key).length;
          return (
            <button key={key}
              className={`${styles.statChip} ${status === key ? styles.statChipActive : ''}`}
              style={{ '--sc': cfg.dot }}
              onClick={() => { const next = status === key ? '' : key; handleStatus(next); }}
            >
              <span className={styles.statDot} style={{ background: cfg.dot }} />
              <span className={styles.statLabel}>{key}</span>
              <span className={styles.statCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Filtres ── */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Icon name="search" size={14} color="var(--ink-muted)" />
          <input
            className={styles.searchInput}
            placeholder="Rechercher…"
            value={search} onChange={handleSearch}
          />
          {search && (
            <button className={styles.searchClear}
              onClick={() => { setSearch(''); applyFilters({ search: '', page: 1 }); }}>×</button>
          )}
        </div>

        <Select value={type} onChange={handleType} style={{ width: 150, height: 36 }}>
          <option value="">Tous les types</option>
          {TYPE_LIST.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>

        {(search || status || type || (isAdmin && myOnly)) && (
          <Button variant="ghost" size="sm" onClick={() => {
            setSearch(''); setStatus(''); setType('');
            if (isAdmin) setMyOnly(false);
            fetch({ page: 1, limit: PAGE_SIZE });
          }}>Réinitialiser</Button>
        )}

        {/* Toggle grille / liste */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('grid')} title="Vue grille">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="0" y="0" width="6" height="6" rx="1"/>
              <rect x="8" y="0" width="6" height="6" rx="1"/>
              <rect x="0" y="8" width="6" height="6" rx="1"/>
              <rect x="8" y="8" width="6" height="6" rx="1"/>
            </svg>
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('list')} title="Vue liste">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="2" y1="3" x2="12" y2="3"/>
              <line x1="2" y1="7" x2="12" y2="7"/>
              <line x1="2" y1="11" x2="12" y2="11"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Contenu ── */}
      {viewMode === 'list' ? (
        <div className={styles.tableWrap}>
          <ProjectsTable
            projects={projects} loading={loading} isAdmin={isAdmin} viewMode="list"
            currentUserId={user?.id}
            onEdit={p => setEditProject(p)}
            onDelete={p => isAdmin && setDeleteTarget(p)}
            onConfirm={p => isAdmin && setConfirmTarget(p)}
          />
        </div>
      ) : (
        <ProjectsTable
          projects={projects} loading={loading} isAdmin={isAdmin} viewMode="grid"
          currentUserId={user?.id}
          onEdit={p => setEditProject(p)}
          onDelete={p => isAdmin && setDeleteTarget(p)}
          onConfirm={p => isAdmin && setConfirmTarget(p)}
        />
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="secondary" size="sm" icon={<Icon name="chevronLeft" size={13} />}
            onClick={() => handlePage(page - 1)} disabled={page <= 1}>Précédent</Button>
          <div className={styles.pageNumbers}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p}
                className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                onClick={() => handlePage(p)}>{p}</button>
            ))}
          </div>
          <Button variant="secondary" size="sm" iconRight={<Icon name="chevronRight" size={13} />}
            onClick={() => handlePage(page + 1)} disabled={page >= totalPages}>Suivant</Button>
        </div>
      )}

      {/* ── Modals ── */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouveau projet" width={620}>
        <ProjectForm
          users={isAdmin ? users : []}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      </Modal>

      <Modal isOpen={!!editProject} onClose={() => setEditProject(null)} title="Modifier le projet" width={620}>
        {editProject && (
          <ProjectForm
            initial={editProject}
            users={isAdmin ? users : []}
            onSave={handleEdit}
            onCancel={() => setEditProject(null)}
            loading={saving}
            isAdmin={isAdmin}
          />
        )}
      </Modal>

      <Confirm
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Supprimer le projet"
        message={`Supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
      />

      <ConfirmProjectModal
        isOpen={!!confirmTarget} project={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm} loading={confirming}
      />
    </div>
  );
}
