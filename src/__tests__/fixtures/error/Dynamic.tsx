import styles from './Dynamic.module.css';

export const Dynamic: React.FC<{ variant: string }> = ({ variant }) => {
  const orientation = 'horizontal';

  return (
    <div className={styles.container}>
      <div className={styles[variant]}>Dynamic variant</div>
      <div className={styles[orientation]}>Dynamic orientation</div>
    </div>
  );
};
