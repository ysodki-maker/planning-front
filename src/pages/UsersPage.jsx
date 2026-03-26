import { useState } from 'react';
import { useUsers }  from '../hooks/useUsers';
import { useToast }  from '../context/ToastContext';
import { usersApi }  from '../api/users.api';

import PageHeader  from '../components/layout/PageHeader';
import Modal       from '../components/common/Modal';
import Confirm     from '../components/common/Confirm';
import Button      from '../components/common/Button';
import Icon        from '../components/common/Icon';
import Avatar      from '../components/common/Avatar';
import { StatusBadge } from '../components/common/Badge';
import { Field, Input, Select } from '../components/common/Field';

import styles from './UsersPage.module.css';

function UserForm({ initial = {}, onSave, onCancel, loading }) {
  const isEdit = !!initial.id;
  const [form, setForm] = useState({
    name:     initial.name     || '',
    email:    initial.email    || '',
    password: '',
    role:     initial.role     || 'user',
    color:    initial.color    || '#1B5C9E',
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Nom requis.';
    if (!form.email.trim()) e.email = 'Email requis.';
    if (!isEdit && !form.password) e.password = 'Mot de passe requis.';
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = { ...form };
    if (isEdit && !payload.password) delete payload.password;
    onSave(payload);
  };

  const colors = ['#C8341B','#1B5C9E','#1A7A4A','#D4680A','#7B3FA0','#1A6B6B'];

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.row2}>
        <Field label="Nom complet" required error={errors.name}>
          <Input value={form.name} onChange={set('name')} placeholder="Prénom Nom" error={errors.name} />
        </Field>
        <Field label="Adresse email" required error={errors.email}>
          <Input type="email" value={form.email} onChange={set('email')} placeholder="email@exemple.com" error={errors.email} />
        </Field>
      </div>

      <div className={styles.row2}>
        <Field label={isEdit ? 'Nouveau mot de passe' : 'Mot de passe'} required={!isEdit} error={errors.password}>
          <Input
            type="password" value={form.password}
            onChange={set('password')}
            placeholder={isEdit ? 'Laisser vide pour ne pas changer' : 'Min. 8 caractères'}
            error={errors.password}
          />
        </Field>
        <Field label="Rôle">
          <Select value={form.role} onChange={set('role')}>
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </Select>
        </Field>
      </div>

      <Field label="Couleur avatar">
        <div className={styles.colorRow}>
          {colors.map((c) => (
            <button
              key={c} type="button"
              className={`${styles.colorDot} ${form.color === c ? styles.colorDotActive : ''}`}
              style={{ background: c }}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
            />
          ))}
        </div>
      </Field>

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>Annuler</Button>
        <Button type="submit" variant="primary" loading={loading}>
          {isEdit ? 'Enregistrer' : 'Créer l\'utilisateur'}
        </Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const toast = useToast();
  const { users, loading, refresh } = useUsers();

  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search,   setSearch]   = useState('');

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await usersApi.create(form);
      toast.success('Utilisateur créé.');
      setShowForm(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await usersApi.update(editUser.id, form);
      toast.success('Utilisateur mis à jour.');
      setEditUser(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await usersApi.delete(deleteTarget.id);
      toast.success('Utilisateur supprimé.');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally { setDeleting(false); }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} membre(s) au total`}
        actions={
          <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={() => setShowForm(true)}>
            Nouvel utilisateur
          </Button>
        }
      />

      {/* Search */}
      <div className={styles.searchBar}>
        <div className={styles.searchWrap}>
          <Icon name="search" size={14} color="var(--ink-muted)" />
          <input
            className={styles.searchInput}
            placeholder="Rechercher un utilisateur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.empty}><div className={styles.spinner} /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="users" size={32} color="var(--ink-ghost)" />
            <p>Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {['Utilisateur', 'Email', 'Rôle', 'Statut', 'Dernière connexion', ''].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className={styles.row}>
                  <td>
                    <div className={styles.userCell}>
                      <Avatar user={u} size={32} />
                      <span className={styles.userName}>{u.name}</span>
                    </div>
                  </td>
                  <td><span className={styles.email}>{u.email}</span></td>
                  <td>
                    <span className={`${styles.roleBadge} ${u.role === 'admin' ? styles.roleAdmin : ''}`}>
                      {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.statusCell}>
                      <span className={u.is_active ? styles.dot : styles.dotOff} />
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </div>
                  </td>
                  <td className={styles.lastLogin}>
                    {u.last_login
                      ? new Date(u.last_login).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => setEditUser(u)} title="Modifier">
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => setDeleteTarget(u)}
                        title="Supprimer"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouvel utilisateur" width={560}>
        <UserForm onSave={handleCreate} onCancel={() => setShowForm(false)} loading={saving} />
      </Modal>

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Modifier l'utilisateur" width={560}>
        {editUser && (
          <UserForm initial={editUser} onSave={handleEdit} onCancel={() => setEditUser(null)} loading={saving} />
        )}
      </Modal>

      <Confirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Supprimer l'utilisateur"
        message={`Supprimer "${deleteTarget?.name}" ? Ses affectations seront également supprimées.`}
      />
    </div>
  );
}
