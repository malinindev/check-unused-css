import styles from '@/AliasWithReferences.module.css';

export const AliasWithNonExistentClass: React.FC = () => (
  <div className={styles.nonExistentClass}>
    <div className={styles.anotherMissingClass} />
  </div>
);
