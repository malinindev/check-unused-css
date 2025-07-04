import styles from './DynamicWithNullish.module.css';

export const DynamicWithNullish: React.FC = () => {
  const theme = undefined;

  return (
    <div className={styles[theme ?? 'usedClass']}>
      Nullish coalescing operator
    </div>
  );
};
