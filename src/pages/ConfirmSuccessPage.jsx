import styles from './ConfirmSuccessPage.module.css';

export default function ConfirmSuccessPage() {
  const params = new URLSearchParams(window.location.search);
  const name   = params.get('name') || 'le projet';

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✓</div>
        <h1 className={styles.title}>Projet confirmé</h1>
        <p className={styles.message}>
          <strong>{decodeURIComponent(name)}</strong> est maintenant <span className={styles.badge}>En cours</span>.
        </p>
        <p className={styles.sub}>L'équipe assignée a été notifiée par email.</p>
      </div>
    </div>
  );
}
