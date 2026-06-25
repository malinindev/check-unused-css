import styles from './CssCombinatorNesting.module.css';

export const CssCombinatorNesting: React.FC = () => (
  <div className={styles.wrapper}>
    <span className={styles.item} />
    <span className={styles.sibling} />
    <span className={styles.general} />
  </div>
);
