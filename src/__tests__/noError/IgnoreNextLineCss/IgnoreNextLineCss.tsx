import styles from './IgnoreNextLineCss.module.css';

export const IgnoreNextLineCss: React.FC = () => (
  <div>
    <div className={styles.usedClass} />
    <div className={styles.anotherUsedClass} />
  </div>
);
