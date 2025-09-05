import styles from './WithScssComments.module.scss';

export const WithScssComments: React.FC = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`} />
);
