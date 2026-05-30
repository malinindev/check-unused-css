import styles from './Comprehensive.module.css';

// The access sites that legitimately cover classes: static, ternary literals,
// and two distinct prefix patterns. None is a covers-all expression, so the
// module is still checked for unused classes.
export const ComprehensiveCovered = ({
  on,
  x,
  y,
}: {
  on: boolean;
  x: string;
  y: string;
}) => {
  return (
    <div className={styles.root}>
      <span className={styles[on ? 'active' : 'inactive']} />
      <p className={styles[`button${x}`]} />
      <i className={styles[`icon${y}`]} />
    </div>
  );
};
