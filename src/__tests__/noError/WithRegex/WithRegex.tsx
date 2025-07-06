import styles from './WithRegex.module.css';

export const WithRegex: React.FC = () => {
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const regex = /["'].*?["']/g;

  return <div className={styles.usedClass} />;
};
