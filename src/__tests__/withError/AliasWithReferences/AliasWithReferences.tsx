import styles from '@/AliasWithReferences.module.css';

export const AliasWithReferences: React.FC = () => (
  <div className={styles.usedClass}>
    <div className={styles.usedClass2} />
  </div>
);
