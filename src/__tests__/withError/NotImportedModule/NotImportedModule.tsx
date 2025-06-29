import styles from './WRONG_IMPORT_PATH.module.css';

export const NotImportedModule: React.FC = () => (
  <div className={styles.usedClass}>
    <div className={styles.usedClass2} />
  </div>
);
