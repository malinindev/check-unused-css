import styles from './NestedCss.module.css';

export const NestedCss: React.FC = () => (
  <div className={styles.usedClass}>
    <div className={styles.usedClass2} />
    <button type="button" className={styles.usedClass3}>
      Button
    </button>
  </div>
);
