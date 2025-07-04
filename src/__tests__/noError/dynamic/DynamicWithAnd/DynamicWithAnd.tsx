import styles from './DynamicWithAnd.module.css';

export const DynamicWithAnd: React.FC = () => {
  const isActive = true;

  return (
    <div className={styles[isActive && 'usedClass']}>Logical AND operator</div>
  );
};
