import styles from './AllCovered.module.css';

export const AllCovered = ({ k }: { k: string }) => {
  return <div className={`${styles.base} ${styles[`btn-${k}`]}`} />;
};
