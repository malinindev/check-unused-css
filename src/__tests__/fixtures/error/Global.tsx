import styles from './Global.module.css';

export const Global: React.FC = () => (
  <div className={styles.localClass}>
    <span className={styles.anotherLocalClass}>Local styles only</span>
  </div>
);
