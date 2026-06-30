import styles from './ScssUseNamespaced.module.scss';

// `.highlight` comes from the namespaced `@use 'colors' as colors` partial;
// `.title` is local. Neither must be reported as non-existent.
export const ScssUseNamespaced = () => (
  <div className={[styles.title, styles.highlight].join(' ')} />
);
