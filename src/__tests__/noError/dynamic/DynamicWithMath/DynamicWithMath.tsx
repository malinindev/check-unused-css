import styles from './DynamicWithMath.module.css';

export const DynamicWithMath: React.FC = () => {
  const index = 1;

  return (
    <div className={styles[`usedClass${index + 1}`]}>
      Mathematical operation
    </div>
  );
};
