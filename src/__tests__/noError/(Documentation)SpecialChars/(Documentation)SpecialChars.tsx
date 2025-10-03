import styles from './(Documentation)SpecialChars.module.css';

export const SpecialCharsComponent: React.FC = () => (
  <div className={styles.class1}>
    <div className={styles.class2} />
    {/* biome-ignore lint/complexity/useLiteralKeys: Testing bracket notation access */}
    <div className={styles['class3']} />
  </div>
);
