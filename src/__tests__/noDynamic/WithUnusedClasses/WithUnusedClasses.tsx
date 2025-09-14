import styles from './WithUnusedClasses.module.css';

export const WithUnusedClasses = () => {
  return <div className={styles.usedClass} />;
};
