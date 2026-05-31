import styles from './ScssDirectivesUnused.module.scss';

// `.button` and `.label` are used; `.orphan` is intentionally left unused so it
// is reported. The mixin/directive names must NOT appear among the unused
// findings — only `.orphan` should.
export const ScssDirectivesUnused = () => (
  <div className={[styles.button, styles.label].join(' ')} />
);
