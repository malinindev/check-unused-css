import styles from './WithRegexAndComment.module.css';

export const WithRegexAndComment: React.FC = () => {
  ''.replace(/\D+/g, '');
  // test '

  return <div className={styles.usedClass} />;
};
