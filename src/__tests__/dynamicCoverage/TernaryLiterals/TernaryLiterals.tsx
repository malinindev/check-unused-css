import styles from './TernaryLiterals.module.css';

export const TernaryLiterals = ({ cond }: { cond: boolean }) => {
  return <div className={styles[cond ? 'a' : 'b']} />;
};
