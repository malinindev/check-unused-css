import styles from './Complex.module.css';

export const Complex: React.FC = () => (
  <div>
    <div className={styles.cardContainer}>
      <h2 className={styles.cardTitle}>Card Title</h2>
    </div>

    <div className={styles.formGroup}>
      <input className={styles.inputField} />
    </div>

    <nav>
      <ul className={styles.navList}>
        <li className={styles.activeItem}>Active Nav Item</li>
      </ul>
    </nav>

    <button type="button" className={styles.buttonDisabled} disabled>
      Disabled Button
    </button>
    <input className={styles.inputRequired} required />

    <div className={`${styles.alert} ${styles.alertSuccess}`}>
      Success alert
    </div>
    <div className={`${styles.modal} ${styles.modalLarge}`}>Large modal</div>

    <div className={styles['multi-word-class']}>Multi word class</div>
    <div className={styles.another_underscore_class}>Underscore class</div>
    <div className={styles['mixedCase_and-dashes']}>Mixed case</div>
  </div>
);
