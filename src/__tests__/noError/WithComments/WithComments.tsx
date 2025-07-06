import styles from './WithComments.module.css';

export const WithComments: React.FC = () => {
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const test = 'image/*';

  return (
    <div className={`${styles.usedClass} ${styles.usedClass2}`}>
      <div className={styles.usedClass3}>{/* comment */}</div>
    </div>
  );
};
