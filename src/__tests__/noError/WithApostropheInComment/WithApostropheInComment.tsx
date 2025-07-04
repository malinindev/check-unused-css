import styles from './WithApostropheInComment.module.css';

export const WithApostropheInComment: React.FC = () => {
  // comment with apostrophe '
  return <div data-test-id={'test'} className={styles.usedClass} />;
};
