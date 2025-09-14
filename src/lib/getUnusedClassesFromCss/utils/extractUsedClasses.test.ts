import { describe, expect, test } from 'bun:test';
import { extractUsedClasses } from './extractUsedClasses.js';

describe('extractUsedClasses', () => {
  test('extracts classes used with dot notation', () => {
    const tsContent = `
      import styles from './test.module.css';
      
      const Component = () => (
        <div className={styles.class1}>
          <div className={styles.class2} />
        </div>
      );
    `;

    const result = extractUsedClasses({
      tsContent,
      importNames: ['styles'],
    });

    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  test('extracts classes used with bracket notation', () => {
    const tsContent = `
      import styles from './test.module.css';
      
      const Component = () => (
        <div className={styles['class-with-dashes']}>
          <div className={styles["class-with-quotes"]} />
        </div>
      );
    `;

    const result = extractUsedClasses({
      tsContent,
      importNames: ['styles'],
    });

    expect(result).toContain('class-with-dashes');
    expect(result).toContain('class-with-quotes');
  });

  test('extracts classes from multiple import names', () => {
    const tsContent = `
      import styles from './test.module.css';
      import otherStyles from './other.module.css';
      
      const Component = () => (
        <div className={styles.class1}>
          <div className={otherStyles.class2} />
        </div>
      );
    `;

    const result = extractUsedClasses({
      tsContent,
      importNames: ['styles', 'otherStyles'],
    });

    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  test('ignores classes from non-imported objects', () => {
    const tsContent = `
      import styles from './test.module.css';
      
      const someObject = { class1: 'value' };
      
      const Component = () => (
        <div className={styles.class1}>
          <div className={someObject.class2} />
        </div>
      );
    `;

    const result = extractUsedClasses({
      tsContent,
      importNames: ['styles'],
    });

    expect(result).toContain('class1');
    expect(result).not.toContain('class2');
  });

  test('handles complex expressions', () => {
    const tsContent = `
      import styles from './test.module.css';
      
      const Component = () => {
        const condition = true;
        return (
          <div className={condition ? styles.class1 : styles.class2}>
            <div className={\`prefix \${styles.class3} suffix\`} />
          </div>
        );
      };
    `;

    const result = extractUsedClasses({
      tsContent,
      importNames: ['styles'],
    });

    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });

  test('returns empty array when no classes are used', () => {
    const tsContent = `
      import styles from './test.module.css';
      
      const Component = () => (
        <div className="global-class">
          Static content
        </div>
      );
    `;

    const result = extractUsedClasses({
      tsContent,
      importNames: ['styles'],
    });

    expect(result).toEqual([]);
  });
});
