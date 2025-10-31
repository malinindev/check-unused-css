import styles from '__tests__/noError/AbsoluteImport/AbsoluteImport.module.css';

export const AbsoluteImport: React.FC = () => (
  <div className={styles.class1}>
    <div className={styles.class2} />
    <span className={styles.class3}>Test text</span>{' '}
    <p className={styles.class4}>Another element</p>{' '}
  </div>
);
