import styles from './LocalClasses.module.scss';

export const LocalClasses: React.FC = () => (
  <div className={styles.active}>
    <div className={`${styles.root} ${styles.selected}`}>
      <div className={styles.parent}>
        <div className={styles.child} />
      </div>
    </div>
  </div>
);
