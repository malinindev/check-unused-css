import styles from './LocalInGlobalBlock.module.scss';

export const LocalInGlobalBlock: React.FC = () => (
  <div className={styles.small}>
    <div className={`${styles.medium} ${styles.active}`}>
      <div className={styles.large} />
    </div>
  </div>
);
