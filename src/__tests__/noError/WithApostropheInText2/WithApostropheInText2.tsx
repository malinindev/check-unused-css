import styles from './WithApostropheInText2.module.css';

export const WithApostropheInText2: React.FC = () => {
  const test = 'azaz';

  return (
    <div className={styles.usedClass1}>
      Text with ' character {test === 'azaz' && <div>hello</div>}
      <span className={styles.usedClass2}>test</span>
    </div>
  );
};
