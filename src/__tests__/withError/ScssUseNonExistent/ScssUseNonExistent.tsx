import styles from './ScssUseNonExistent.module.scss';

// `.shared` (from the partial) and `.local` (from the module) exist.
// `.ghost` exists nowhere, so it must be reported as non-existent even though
// the module pulls in classes via `@use`.
export const ScssUseNonExistent = () => (
  <div className={[styles.shared, styles.local, styles.ghost].join(' ')} />
);
