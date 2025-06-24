import styles from './Clean.module.css';

export const Clean: React.FC = () => (
  <div className={styles.header}>
    <div className={styles.content}>
      <button type="button" className={styles.button}>
        Click me
      </button>
    </div>
  </div>
);
