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

import { STATUS_LIST, TYPE_LIST, PAGE_SIZE } from '../utils/constants';
import styles from './ProjectsPage.module.css';

export default function ProjectsPage() {
  const { isAdmin }  = useAuth();
  const toast        = useToast();
  const { users }    = useUsers();

  const { projects, pagination, loading, fetch } = useProjects({ limit: PAGE_SIZE });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type,   setType]   = useState('');
  const [page,   setPage]   = useState(1);

  const [showForm,      setShowForm]      = useState(false);
  const [editProject,   setEditProject]   = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // projet à confirmer
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [confirming, setConfirming] = useState(false);

  const applyFilters = useCallback((overrides = {}) => {
    const params = { page, limit: PAGE_SIZE, search, status, type, ...overrides };
    setPage(params.page);
    fetch(params);
  }, [page, search, status, type, fetch]);

  const handleSearch = (e) => { setSearch(e.target.value); applyFilters({ search: e.target.value, page: 1 }); };
  const handleStatus = (e) => { setStatus(e.target.value); applyFilters({ status: e.target.value, page: 1 }); };
  const handleType   = (e) => { setType(e.target.value);   applyFilters({ type: e.target.value, page: 1 }); };
  const handlePage   = (p) => applyFilters({ page: p });

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

  // ── Confirmation avec dates/heures ────────────────────────────────────────
  const handleConfirm = async (dateForm) => {
    setConfirming(true);
    try {
      await projectsApi.confirm(confirmTarget.id, dateForm);
      toast.success(`"${confirmTarget.name}" confirmé — passé En cours. L'équipe a été notifiée.`);
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
        title="Projets"
        subtitle={pagination ? `${pagination.total} projet(s) au total` : ''}
        actions={isAdmin && (
          <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={() => setShowForm(true)}>
            Nouveau projet
          </Button>
        )}
      />

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Icon name="search" size={14} color="var(--ink-muted)" />
          <input
            className={styles.searchInput}
            placeholder="Rechercher un projet, une ville…"
            value={search} onChange={handleSearch}
          />
        </div>
        <Select value={status} onChange={handleStatus} style={{ width: 200 }}>
          <option value="">Tous les statuts</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={type} onChange={handleType} style={{ width: 160 }}>
          <option value="">Tous les types</option>
          {TYPE_LIST.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        {(search || status || type) && (
          <Button variant="ghost" size="sm" onClick={() => {
            setSearch(''); setStatus(''); setType('');
            fetch({ page: 1, limit: PAGE_SIZE });
          }}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <ProjectsTable
          projects={projects} loading={loading} isAdmin={isAdmin}
          onEdit={(p) => setEditProject(p)}
          onDelete={(p) => setDeleteTarget(p)}
          onConfirm={(p) => setConfirmTarget(p)}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="secondary" size="sm" icon={<Icon name="chevronLeft" size={13} />}
            onClick={() => handlePage(page - 1)} disabled={page <= 1}>Précédent</Button>
          <div className={styles.pageNumbers}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                onClick={() => handlePage(p)}>{p}</button>
            ))}
          </div>
          <Button variant="secondary" size="sm" iconRight={<Icon name="chevronRight" size={13} />}
            onClick={() => handlePage(page + 1)} disabled={page >= totalPages}>Suivant</Button>
        </div>
      )}

      {/* Modal création */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouveau projet" width={620}>
        <ProjectForm users={users} onSave={handleCreate} onCancel={() => setShowForm(false)} loading={saving} />
      </Modal>

      {/* Modal édition */}
      <Modal isOpen={!!editProject} onClose={() => setEditProject(null)} title="Modifier le projet" width={620}>
        {editProject && (
          <ProjectForm initial={editProject} users={users}
            onSave={handleEdit} onCancel={() => setEditProject(null)} loading={saving} />
        )}
      </Modal>

      {/* Confirm suppression */}
      <Confirm
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Supprimer le projet"
        message={`Supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
      />

      {/* Modale confirmation projet avec dates/heures */}
      <ConfirmProjectModal
        isOpen={!!confirmTarget}
        project={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        loading={confirming}
      />
    </div>
  );
}
