import styles from './NestedTernaryLiterals.module.css';

export const NestedTernaryLiterals = ({ k }: { k: number }) => {
  return <div className={styles[k === 1 ? 'a' : k === 2 ? 'b' : 'c']} />;
};
