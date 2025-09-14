import styles from './WithoutDynamic.module.css';

export const WithoutDynamic = () => {
  return (
    <div className={styles.usedClass}>
      <span className={styles.anotherUsedClass}>Test</span>
    </div>
  );
};
