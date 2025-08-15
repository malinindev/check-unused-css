import styles from './WithApostropheInText.module.css';

export const WithApostropheInText: React.FC = () => (
  <div className={styles.usedClass1}>
    The ' character is making
    <span className={styles.usedClass2}>the test fail</span>
  </div>
);
