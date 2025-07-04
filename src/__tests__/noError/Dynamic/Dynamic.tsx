import styles from './Dynamic.module.css';

const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const Dynamic: React.FC = () => {
  const variant = 'large';
  const status = 'active';

  return (
    <div>
      <div className={styles[`class${capitalize(variant)}`]}>
        Dynamic class access
      </div>
      <div className={styles['kebab-case-class']}>
        Static access with brackets
      </div>
      <div className={styles[`status${capitalize(status)}`]}>
        Dynamic status class
      </div>
      <div className={styles.staticClass}>Static dot access</div>
    </div>
  );
};
