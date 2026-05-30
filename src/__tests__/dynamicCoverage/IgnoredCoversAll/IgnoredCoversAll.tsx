import styles from './IgnoredCoversAll.module.css';

// `onlyViaDynamic` is reachable solely through the dynamic access below. Even
// though that line carries a disable-next-line directive, the access must still
// suppress the whole module — otherwise `onlyViaDynamic` would be wrongly
// reported as unused.
export const IgnoredCoversAll = ({ variant }: { variant: string }) => {
  return (
    <div className={styles.usedStatically}>
      {/* check-unused-css-disable-next-line */}
      <span className={styles[variant]} />
    </div>
  );
};
