import styles from './DynamicWithTemplates.module.css';

export const DynamicWithTemplates: React.FC = () => {
  const variant = 'primary';

  return (
    <div className={styles[`class${variant}`]}>
      Template string with variable
    </div>
  );
};
