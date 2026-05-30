import styles from './BareVariable.module.css';

export const BareVariable = ({ variant }: { variant: string }) => {
  return <div className={`${styles.usedClass} ${styles[variant]}`} />;
};
