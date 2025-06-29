import styles from './Nested.module.css';

export const Nested: React.FC = () => (
  <div>
    <div className={styles.complexNested}>
      <div className={styles.level1}>
        <div className={styles.level2}>
          <div className={styles.level3}>Deep nested content</div>
        </div>
      </div>
    </div>

    <div className={styles.deepContainer}>
      <div className={styles.section}>
        <div className={styles.article}>
          <div className={styles.paragraph}>
            <div className={styles.text}>Deep text</div>
          </div>
        </div>
      </div>
    </div>

    <div className={styles.parentClass}>
      <div className={styles.childClass}>
        <div className={styles.grandchildClass}>Mixed nested</div>
      </div>
    </div>
  </div>
);
