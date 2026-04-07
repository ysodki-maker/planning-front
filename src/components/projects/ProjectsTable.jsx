import { useState } from 'react';
import { StatusBadge, TypeBadge } from '../common/Badge';
import { AvatarGroup } from '../common/Avatar';
import Icon from '../common/Icon';
import { fmtDate, fmtTimeRange, daysLeft } from '../../utils/helpers';
import { STATUS_CONFIG } from '../../utils/constants';
import styles from './ProjectsTable.module.css';

function DaysChip({ endDate, status }) {
  if (status === 'Terminé') return null;
  const d = daysLeft(endDate);
  if (d < 0)  return <span className={`${styles.urgency} ${styles.urgencyRed}`}>En retard</span>;
  if (d <= 7) return <span className={`${styles.urgency} ${styles.urgencyOrange}`}>{d}j</span>;
  return null;
}

function ProjectCard({ p, onEdit, onDelete, onConfirm, isAdmin }) {
  const isDemande = p.status === "Demande de planification";
  const cfg       = STATUS_CONFIG[p.status] || {};
  const timeRange = fmtTimeRange(p.heure_debut, p.heure_fin);

  return (
    <div className={styles.card} style={{ '--status-color': cfg.dot }}>
      {/* Barre de statut en haut */}
      <div className={styles.cardStatusBar} style={{ background: cfg.dot }}/>

      <div className={styles.cardBody}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardName}>{p.name}</h3>
            <div className={styles.cardActions}>
              {isAdmin && isDemande && onConfirm && (
                <button className={`${styles.cardBtn} ${styles.cardBtnConfirm}`}
                  onClick={() => onConfirm(p)} title="Confirmer">
                  <Icon name="check" size={13} />
                </button>
              )}
              <button className={styles.cardBtn} onClick={() => onEdit(p)} title="Modifier">
                <Icon name="edit" size={13} />
              </button>
              {isAdmin && (
                <button className={`${styles.cardBtn} ${styles.cardBtnDanger}`}
                  onClick={() => onDelete(p)} title="Supprimer">
                  <Icon name="trash" size={13} />
                </button>
              )}
            </div>
          </div>

          <div className={styles.cardBadges}>
            <StatusBadge status={p.status} />
            <TypeBadge type={p.type} />
            <DaysChip endDate={p.end_date} status={p.status} />
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <p className={styles.cardDesc}>{p.description}</p>
        )}

        {/* Infos */}
        <div className={styles.cardMeta}>
          {p.ville && (
            <div className={styles.metaItem}>
              <Icon name="mapPin" size={12} color="var(--ink-muted)" />
              <span>{p.ville}</span>
            </div>
          )}
          {(p.start_date || p.end_date) && (
            <div className={styles.metaItem}>
              <Icon name="calendar" size={12} color="var(--ink-muted)" />
              <span>
                {fmtDate(p.start_date) || '—'}
                {' → '}
                {fmtDate(p.end_date) || '—'}
              </span>
            </div>
          )}
          {timeRange && (
            <div className={styles.metaItem}>
              <Icon name="clock" size={12} color="var(--ink-muted)" />
              <span>{timeRange}</span>
            </div>
          )}
          {p.localisation && (
            <div className={styles.metaItem}>
              <Icon name="eye" size={12} color="var(--ink-muted)" />
              <span className={styles.metaLoc}>{p.localisation}</span>
            </div>
          )}
        </div>

        {/* Footer : équipe */}
        {p.assigned_users?.length > 0 && (
          <div className={styles.cardFooter}>
            <AvatarGroup users={p.assigned_users} max={5} size={26} />
            <span className={styles.teamCount}>
              {p.assigned_users.length} membre{p.assigned_users.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsTable({ projects, onEdit, onDelete, onConfirm, isAdmin, loading, viewMode = 'grid' }) {
  if (loading) return (
    <div className={styles.empty}>
      <div className={styles.spinner} />
      <p>Chargement…</p>
    </div>
  );

  if (!projects.length) return (
    <div className={styles.empty}>
      <Icon name="folder" size={40} color="var(--ink-ghost)" />
      <p>Aucun projet trouvé.</p>
    </div>
  );

  if (viewMode === 'list') {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {['Projet','Ville','Type','Statut','Période','Horaires','Équipe',''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => {
              const isDemande = p.status === "Demande de planification";
              const timeRange = fmtTimeRange(p.heure_debut, p.heure_fin);
              return (
                <tr key={p.id} className={styles.tableRow}>
                  <td>
                    <div className={styles.tableName}>{p.name}</div>
                    {p.description && <div className={styles.tableDesc}>{p.description}</div>}
                  </td>
                  <td><div className={styles.metaItem}><Icon name="mapPin" size={11} color="var(--ink-muted)"/>{p.ville||'—'}</div></td>
                  <td><TypeBadge type={p.type} /></td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <div className={styles.period}>
                      <span>{fmtDate(p.start_date)||'—'}</span>
                      <span className={styles.arrow}>→</span>
                      <span>{fmtDate(p.end_date)||'—'}</span>
                      <DaysChip endDate={p.end_date} status={p.status}/>
                    </div>
                  </td>
                  <td>{timeRange ? <span className={styles.timeTag}>{timeRange}</span> : <span className={styles.muted}>—</span>}</td>
                  <td><AvatarGroup users={p.assigned_users||[]} max={3} size={24}/></td>
                  <td>
                    <div className={styles.tableActions}>
                      {isAdmin && isDemande && onConfirm && (
                        <button className={`${styles.actionBtn} ${styles.actionBtnConfirm}`} onClick={()=>onConfirm(p)} title="Confirmer">
                          <Icon name="check" size={13}/>
                        </button>
                      )}
                      <button className={styles.actionBtn} onClick={()=>onEdit(p)} title="Modifier">
                        <Icon name="edit" size={13}/>
                      </button>
                      {isAdmin && (
                        <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={()=>onDelete(p)} title="Supprimer">
                          <Icon name="trash" size={13}/>
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

  // Vue grille (défaut)
  return (
    <div className={styles.grid}>
      {projects.map(p => (
        <ProjectCard key={p.id} p={p}
          onEdit={onEdit} onDelete={onDelete} onConfirm={onConfirm} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
