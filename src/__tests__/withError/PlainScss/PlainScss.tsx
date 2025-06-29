import styles from './PlainScss.module.scss';

export const PlainScss: React.FC = () => (
  <div className={styles.usedClass}>
    <div className={styles.usedClass2} />
  </div>
);
