import styles from './IgnoreNextLineTs.module.css';

export const IgnoreNextLineTs: React.FC = () => (
  <div>
    <div className={styles.usedClass} />
    {/* check-unused-css-disable-next-line */}
    <div className={styles.unusedClass} />
    <div className={styles.anotherUsedClass} />
  </div>
);
