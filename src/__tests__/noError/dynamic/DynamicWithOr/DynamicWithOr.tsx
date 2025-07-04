import styles from './DynamicWithOr.module.css';

export const DynamicWithOr: React.FC = () => {
  const theme = null;

  return (
    <div className={styles[theme || 'usedClass']}>Logical OR operator</div>
  );
};
