import { useState } from 'react';
import { Field, Input, Select, Textarea } from '../common/Field';
import Button from '../common/Button';
import Avatar from '../common/Avatar';
import { STATUS_LIST, TYPE_LIST } from '../../utils/constants';
import { isoDate, fmtTime } from '../../utils/helpers';
import styles from './ProjectForm.module.css';

const EMPTY = {
  name: '', ville: '', status: "Demande d'affectation",
  type: 'Relevé', start_date: '', end_date: '',
  heure_debut: '', heure_fin: '',
  description: '', user_ids: [],
};

function validate(form) {
  const errors = {};
  if (!form.name.trim())  errors.name  = 'Nom du projet requis.';
  if (!form.ville.trim()) errors.ville = 'Ville requise.';
  if (!form.start_date)   errors.start_date = 'Date de début requise.';
  if (!form.end_date)     errors.end_date   = 'Date de fin requise.';
  if (form.start_date && form.end_date && form.end_date < form.start_date)
    errors.end_date = 'La date de fin doit être après le début.';
  if (form.heure_debut && form.heure_fin && form.heure_fin <= form.heure_debut)
    errors.heure_fin = "L'heure de fin doit être après l'heure de début.";
  if (!form.user_ids.length) errors.user_ids = 'Assignez au moins un utilisateur.';
  return errors;
}

export default function ProjectForm({ initial = {}, users = [], onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    start_date:  isoDate(initial.start_date),
    end_date:    isoDate(initial.end_date),
    heure_debut: fmtTime(initial.heure_debut) || '',
    heure_fin:   fmtTime(initial.heure_fin)   || '',
    user_ids:    (initial.assigned_users || []).map((u) => u.id),
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleUser = (id) =>
    setForm((f) => ({
      ...f,
      user_ids: f.user_ids.includes(id)
        ? f.user_ids.filter((u) => u !== id)
        : [...f.user_ids, id],
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    onSave({
      ...form,
      heure_debut: form.heure_debut || null,
      heure_fin:   form.heure_fin   || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Nom + Ville */}
      <div className={styles.row2}>
        <Field label="Nom du projet" required error={errors.name}>
          <Input
            value={form.name} onChange={set('name')}
            placeholder="Ex : Rénovation Siège" error={errors.name}
          />
        </Field>
        <Field label="Ville" required error={errors.ville}>
          <Input
            value={form.ville} onChange={set('ville')}
            placeholder="Ex : Casablanca" error={errors.ville}
          />
        </Field>
      </div>

      {/* Statut + Type */}
      <div className={styles.row2}>
        <Field label="Statut">
          <Select value={form.status} onChange={set('status')}>
            {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={set('type')}>
            {TYPE_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </div>

      {/* Dates */}
      <div className={styles.row2}>
        <Field label="Date de début" required error={errors.start_date}>
          <Input type="date" value={form.start_date} onChange={set('start_date')} error={errors.start_date} />
        </Field>
        <Field label="Date de fin" required error={errors.end_date}>
          <Input type="date" value={form.end_date} onChange={set('end_date')} min={form.start_date} error={errors.end_date} />
        </Field>
      </div>

      {/* Heures */}
      <div className={styles.row2}>
        <Field label="Heure de début" hint="Optionnel — ex : 08:30" error={errors.heure_debut}>
          <Input type="time" value={form.heure_debut} onChange={set('heure_debut')} error={errors.heure_debut} />
        </Field>
        <Field label="Heure de fin" hint="Optionnel — ex : 17:00" error={errors.heure_fin}>
          <Input type="time" value={form.heure_fin} onChange={set('heure_fin')} min={form.heure_debut} error={errors.heure_fin} />
        </Field>
      </div>

      {/* Assignation */}
      <Field label="Assigner à" required error={errors.user_ids}>
        <div className={styles.userGrid}>
          {users.map((u) => {
            const selected = form.user_ids.includes(u.id);
            return (
              <button
                key={u.id} type="button"
                onClick={() => toggleUser(u.id)}
                className={`${styles.userChip} ${selected ? styles.userChipActive : ''}`}
              >
                <Avatar user={u} size={22} />
                <span>{u.name}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Description */}
      <Field label="Description">
        <Textarea
          value={form.description} onChange={set('description')}
          placeholder="Détails optionnels du projet…" rows={3}
        />
      </Field>

      {/* Actions */}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>Annuler</Button>
        <Button type="submit" variant="primary" loading={loading}>
          {initial.id ? 'Enregistrer les modifications' : 'Créer le projet'}
        </Button>
      </div>
    </form>
  );
}