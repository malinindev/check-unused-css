import styles from './WithNotClosedQuote.module.css';

export const WithNotClosedQuote: React.FC = () => {
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text = 'test error with apostrophe - "';

  return <div className={styles.usedClass} />;
};
