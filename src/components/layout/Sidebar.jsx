import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';
import Icon from '../common/Icon';
import Avatar from '../common/Avatar';
import styles from './Sidebar.module.css';

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout, isAdmin } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.id !== 'users' || isAdmin
  );

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoMark}>PN</div>
        <div className={styles.logoText}>
          <span className={styles.logoSub}>Gestion Planning</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <p className={styles.navLabel}>Navigation</p>
        {visibleItems.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activePage === item.id ? styles.active : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} size={15} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.userRow}>
          <Avatar user={user} size={30} />
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.userRole}>{user?.role}</span>
          </div>
        </div>
        <button className={styles.logout} onClick={logout} title="Déconnexion">
          <Icon name="logout" size={15} />
        </button>
      </div>
    </aside>
  );
}
