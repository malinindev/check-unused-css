import styles from './ComposesLocalDirectUse.module.css';

// Issue #83: `.definedClass` is a real local class, also composed into
// `.composingClass`. Reading `styles.definedClass` must resolve (not be flagged
// "non-existent"). Only `.composingClass` — never used in code — is unused.
export const ComposesLocalDirectUse = () => (
  <div className={styles.definedClass}>Hello</div>
);
