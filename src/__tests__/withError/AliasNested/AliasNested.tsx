import styles from '@components/Button.module.css';

export const AliasNested: React.FC = () => (
  <div className={styles.usedClass}>
    <div className={styles.usedClass2} />
  </div>
);
