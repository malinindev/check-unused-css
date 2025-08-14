import styles from './WithJSXComments.module.css';

export const WithJSXComments: React.FC = () => {
  return (
    <div className={styles.usedClass}>
      Text with apostrophe ' character
      {/* <span className={styles.unusedClass}>test</span> */}
    </div>
  );
};
