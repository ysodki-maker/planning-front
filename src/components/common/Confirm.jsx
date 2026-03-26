import Modal from './Modal';
import Button from './Button';
import styles from './Confirm.module.css';

export default function Confirm({ isOpen, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={420}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="accent" onClick={onConfirm} loading={loading}>
          Confirmer
        </Button>
      </div>
    </Modal>
  );
}
