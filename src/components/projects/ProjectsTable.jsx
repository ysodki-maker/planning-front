import { StatusBadge, TypeBadge } from '../common/Badge';
import { AvatarGroup } from '../common/Avatar';
import Icon from '../common/Icon';
import { fmtDate, fmtTimeRange, daysLeft, truncate } from '../../utils/helpers';
import styles from './ProjectsTable.module.css';

const COLS = [
  { key: 'name',    label: 'Projet',       width: '20%' },
  { key: 'ville',   label: 'Ville',        width: '9%'  },
  { key: 'type',    label: 'Type',         width: '9%'  },
  { key: 'status',  label: 'Statut',       width: '14%' },
  { key: 'period',  label: 'Période',      width: '13%' },
  { key: 'hours',   label: 'Horaires',     width: '9%'  },
  { key: 'loc',     label: 'Localisation', width: '10%' },
  { key: 'team',    label: 'Équipe',       width: '7%'  },
  { key: 'actions', label: '',             width: '9%'  },
];

function DaysChip({ endDate, status }) {
  if (status === 'Terminé') return null;
  const d = daysLeft(endDate);
  if (d < 0)  return <span className={`${styles.chip} ${styles.chipRed}`}>En retard</span>;
  if (d <= 7) return <span className={`${styles.chip} ${styles.chipOrange}`}>{d}j</span>;
  return null;
}

export default function ProjectsTable({ projects, onEdit, onDelete, onConfirm, isAdmin, loading }) {
  if (loading) return (
    <div className={styles.empty}>
      <div className={styles.spinner} />
      <p>Chargement…</p>
    </div>
  );

  if (!projects.length) return (
    <div className={styles.empty}>
      <Icon name="folder" size={32} color="var(--ink-ghost)" />
      <p>Aucun projet trouvé.</p>
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {COLS.map(c => <th key={c.key} style={{ width: c.width }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {projects.map(p => {
            const timeRange = fmtTimeRange(p.heure_debut, p.heure_fin);
            const isDemande = p.status === "Demande d'affectation";
            return (
              <tr key={p.id} className={styles.row}>

                {/* Projet */}
                <td>
                  <div className={styles.projectName}>{p.name}</div>
                  {p.description && <div className={styles.projectDesc}>{p.description}</div>}
                </td>

                {/* Ville */}
                <td>
                  <div className={styles.ville}>
                    <Icon name="mapPin" size={12} color="var(--ink-muted)" />
                    {p.ville}
                  </div>
                </td>

                {/* Type */}
                <td><TypeBadge type={p.type} /></td>

                {/* Statut */}
                <td><StatusBadge status={p.status} /></td>

                {/* Période */}
                <td>
                  <div className={styles.period}>
                    <span>{fmtDate(p.start_date)}</span>
                    <span className={styles.arrow}>→</span>
                    <span>{fmtDate(p.end_date)}</span>
                    <DaysChip endDate={p.end_date} status={p.status} />
                  </div>
                </td>

                {/* Horaires */}
                <td>
                  {timeRange
                    ? <span className={styles.timeRange}>{timeRange}</span>
                    : <span className={styles.timeMuted}>—</span>}
                </td>

                {/* Localisation */}
                <td>
                  {p.localisation
                    ? <span className={styles.locText} title={p.localisation}>{truncate(p.localisation, 30)}</span>
                    : <span className={styles.timeMuted}>—</span>}
                </td>

                {/* Équipe */}
                <td><AvatarGroup users={p.assigned_users || []} max={3} size={24} /></td>

                {/* Actions */}
                <td>
                  <div className={styles.actions}>

                    {/* Bouton Confirmer — uniquement sur "Demande d'affectation" */}
                    {isAdmin && isDemande && onConfirm && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnConfirm}`}
                        onClick={() => onConfirm(p)}
                        title="Confirmer — passer En cours"
                      >
                        <Icon name="check" size={14} />
                      </button>
                    )}

                    {/* Modifier */}
                    <button
                      className={styles.actionBtn}
                      onClick={() => onEdit(p)}
                      title="Modifier"
                    >
                      <Icon name="edit" size={14} />
                    </button>

                    {/* Supprimer */}
                    {isAdmin && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => onDelete(p)}
                        title="Supprimer"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
