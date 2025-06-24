import styles from './Button.module.css';

export const Button: React.FC<React.PropsWithChildren> = ({ children }) => (
  <button type="button" className={styles.base}>
    {children}
  </button>
);
