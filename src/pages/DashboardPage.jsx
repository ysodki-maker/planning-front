import { useProjectStats } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { StatusBadge, TypeBadge } from '../components/common/Badge';
import PageHeader from '../components/layout/PageHeader';
import { pct } from '../utils/helpers';
import { STATUS_CONFIG } from '../utils/constants';
import styles from './DashboardPage.module.css';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard} style={accent ? { borderLeftColor: accent } : {}}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, total, color }) {
  const p = pct(value, total);
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressBg}>
        <div className={styles.progressFill} style={{ width: `${p}%`, background: color }} />
      </div>
      <span className={styles.progressPct}>{p}%</span>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, loading } = useProjectStats();
  const { users } = useUsers();

  if (loading) return (
    <div className={styles.loader}>
      <div className={styles.spinner} />
    </div>
  );

  const total = stats?.total || 0;
  const byStatus = stats?.by_status || {};

  const statusRows = [
    { key: "Demande d'affectation", cfg: STATUS_CONFIG["Demande d'affectation"] },
    { key: 'En cours',              cfg: STATUS_CONFIG['En cours'] },
    { key: 'Terminé',               cfg: STATUS_CONFIG['Terminé'] },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de l'activité projets"
      />

      <div className={styles.content}>
        {/* Stat cards */}
        <div className={styles.statsRow}>
          <StatCard label="Projets total" value={total} />
          {statusRows.map(({ key, cfg }) => (
            <StatCard
              key={key}
              label={key}
              value={byStatus[key] ?? 0}
              sub={`${pct(byStatus[key] ?? 0, total)}% du total`}
              accent={cfg.dot}
            />
          ))}
          <StatCard label="Membres d'équipe" value={users.length} />
        </div>

        <div className={styles.grid}>
          {/* Répartition statuts */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Répartition par statut</h3>
            <div className={styles.statusList}>
              {statusRows.map(({ key, cfg }) => (
                <div key={key} className={styles.statusRow}>
                  <div className={styles.statusMeta}>
                    <StatusBadge status={key} />
                    <span className={styles.statusCount}>{byStatus[key] ?? 0} projets</span>
                  </div>
                  <ProgressBar value={byStatus[key] ?? 0} total={total} color={cfg.dot} />
                </div>
              ))}
            </div>
          </div>

          {/* Équipe */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Équipe ({users.length})</h3>
            <div className={styles.teamList}>
              {users.map((u) => (
                <div key={u.id} className={styles.teamMember}>
                  <div className={styles.teamAvatar} style={{ background: u.color || '#111' }}>
                    {(u.avatar || u.name?.slice(0,2) || '??').toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.teamName}>{u.name}</div>
                    <div className={styles.teamRole}>{u.role}</div>
                  </div>
                  <div className={styles.teamStatus}>
                    <span className={u.is_active ? styles.dot : styles.dotOff} />
                    {u.is_active ? 'Actif' : 'Inactif'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
