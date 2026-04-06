import { useState } from 'react';
import Modal   from '../common/Modal';
import Button  from '../common/Button';
import Avatar  from '../common/Avatar';
import { Field, Input } from '../common/Field';
import { isoDate, fmtTime } from '../../utils/helpers';
import { useUsers } from '../../hooks/useUsers';
import styles from './ConfirmProjectModal.module.css';

export default function ConfirmProjectModal({ project, isOpen, onClose, onConfirm, loading }) {
  const { users } = useUsers();

  const [form, setForm] = useState({
    start_date:  isoDate(project?.start_date)  || '',
    end_date:    isoDate(project?.end_date)    || '',
    heure_debut: fmtTime(project?.heure_debut) || '',
    heure_fin:   fmtTime(project?.heure_fin)   || '',
    user_ids:    (project?.assigned_users || []).map(u => u.id),
  });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleUser = (id) => setForm(f => ({
    ...f,
    user_ids: f.user_ids.includes(id)
      ? f.user_ids.filter(u => u !== id)
      : [...f.user_ids, id],
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('La date de fin doit être après la date de début.');
      return;
    }
    if (form.heure_debut && form.heure_fin && form.heure_fin <= form.heure_debut) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    onConfirm({
      start_date:  form.start_date  || null,
      end_date:    form.end_date    || null,
      heure_debut: form.heure_debut || null,
      heure_fin:   form.heure_fin   || null,
      user_ids:    form.user_ids,
    });
  };

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmer le projet" width={560}>
      <form onSubmit={handleSubmit} className={styles.form}>

        {/* Résumé projet */}
        <div className={styles.projectCard}>
          <div className={styles.projectName}>{project.name}</div>
          <div className={styles.projectMeta}>
            {project.ville && <span>📍 {project.ville}</span>}
            {project.type  && <span className={styles.typeBadge}>{project.type}</span>}
          </div>
          {project.description && (
            <div className={styles.projectDesc}>{project.description}</div>
          )}
        </div>

        {/* Alerte */}
        <div className={styles.alertBox}>
          Le projet passera en <strong>En cours</strong>.
          L'équipe sera notifiée par email avec tous les détails.
        </div>

        {/* Dates */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Dates <span className={styles.opt}>(optionnel)</span></div>
          <div className={styles.row2}>
            <Field label="Date de début">
              <Input type="date" value={form.start_date} onChange={set('start_date')} />
            </Field>
            <Field label="Date de fin">
              <Input type="date" value={form.end_date}
                min={form.start_date || undefined} onChange={set('end_date')} />
            </Field>
          </div>
        </div>

        {/* Heures */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Horaires <span className={styles.opt}>(optionnel)</span></div>
          <div className={styles.row2}>
            <Field label="Heure de début">
              <Input type="time" value={form.heure_debut} onChange={set('heure_debut')} />
            </Field>
            <Field label="Heure de fin">
              <Input type="time" value={form.heure_fin}
                min={form.heure_debut || undefined} onChange={set('heure_fin')} />
            </Field>
          </div>
        </div>

        {/* Équipe */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Équipe assignée <span className={styles.opt}>(optionnel)</span></div>
          <div className={styles.userGrid}>
            {users.map(u => {
              const selected = form.user_ids.includes(u.id);
              return (
                <button key={u.id} type="button"
                  onClick={() => toggleUser(u.id)}
                  className={`${styles.userChip} ${selected ? styles.userChipActive : ''}`}
                >
                  <Avatar user={u} size={22} />
                  <span>{u.name}</span>
                  {selected && <span className={styles.checkMark}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {error && <div className={styles.errorBox}>⚠ {error}</div>}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            ✓ Confirmer — passer En cours
          </Button>
        </div>
      </form>
    </Modal>
  );
}
