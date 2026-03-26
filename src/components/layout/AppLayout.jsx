import Sidebar from './Sidebar';
import styles from './AppLayout.module.css';

export default function AppLayout({ activePage, onNavigate, children }) {
  return (
    <div className={styles.layout}>
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
