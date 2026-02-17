import styles from './ScssAmpersandConcat.module.scss';

export const ScssAmpersandConcat: React.FC = () => (
  <div className={styles.usedClass}>
    <div className={styles.usedClassSuffix} />
    <div className={styles.usedClassSuffix2} />
    <div className={styles.usedClass2}>
      <div className={styles.usedClass2Child} />
    </div>
    <div className={styles.usedClass3}>
      <div className={styles.usedClass3Nested}>
        <div className={styles.usedClass3NestedDeep} />
      </div>
    </div>
  </div>
);
