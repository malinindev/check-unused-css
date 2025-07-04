import styles from './DynamicWithCondition.module.css';

export const DynamicWithCondition: React.FC = () => {
  const isActive = true;

  return (
    <div className={styles[isActive ? 'usedClass' : 'usedClass2']}>
      Ternary operator
    </div>
  );
};
