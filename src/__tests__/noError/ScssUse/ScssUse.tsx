import styles from './ScssUse.module.scss';

// `.box` and `.panel` come from the `@use 'shared'` partial; `.local` is
// defined in the module itself. None must be reported as non-existent.
export const ScssUse = () => (
  <div className={[styles.box, styles.panel, styles.local].join(' ')} />
);
