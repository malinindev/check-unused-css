// check-unused-css-disable
import styles from './IgnoreFileTs.module.css';

export const IgnoreFileTs: React.FC = () => (
  <div>
    <div className={styles.unusedClass} />
    <div className={styles.anotherUnusedClass} />
  </div>
);
