import styles from './ScssImportCycle.module.scss';

// `.ping` and `.pong` come from a pair of partials that `@import` each other.
// The resolver must terminate on the cycle and still surface both classes.
export const ScssImportCycle = () => (
  <div className={[styles.host, styles.ping, styles.pong].join(' ')} />
);
