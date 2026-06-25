import styles from './ScssCombinatorNesting.module.scss';

export const ScssCombinatorNesting: React.FC = () => (
  <div className={styles.wrapper}>
    <span className={styles.item} />
    <span className={styles.sibling} />
    <span className={styles.general} />
    <span className={styles.ampersandChild} />
    <div className={styles.list}>
      <span className={styles.first} />
      <span className={styles.second} />
    </div>
  </div>
);
