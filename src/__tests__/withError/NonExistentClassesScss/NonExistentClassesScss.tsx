import styles from './NonExistentClassesScss.module.scss';

export const NonExistentClassesScss: React.FC = () => (
  <div className={styles.validClass}>
    <div className={styles.invalidClass} />
    {/* biome-ignore lint/complexity/useLiteralKeys: Testing bracket notation access */}
    <div className={styles['anotherInvalidClass']} />
    <div className={styles.anotherValidClass} />
  </div>
);
