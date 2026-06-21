import styles from './ComposesFromExternal.module.css';

// `.card` composes from an external module and from global. Those targets
// (`base`, `highlight`) are not local classes and must not leak as defined
// classes. `.card` is used directly, so the run must be clean.
export const ComposesFromExternal = () => (
  <div className={styles.card}>Hello</div>
);
