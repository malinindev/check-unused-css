import styles from './ComposedClasses.module.css';

export const ComposedClasses: React.FC = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`} />
);
