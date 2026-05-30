import styles from './shared.module.css';

// Pattern `^btn-.*$` covers `btn-a` but leaves `loner` unmatched on its own.
export const PatternFile = ({ x }: { x: string }) => {
  return <div className={styles[`btn-${x}`]} />;
};
