import styles from './ComposesLocalIndirectUse.module.css';

// `.button` is used directly and composes `.base`. `.base` is referenced only
// via `composes` — it must count as used, not unused. Only `.orphan` is unused.
export const ComposesLocalIndirectUse = () => (
  <div className={styles.button}>Hello</div>
);
