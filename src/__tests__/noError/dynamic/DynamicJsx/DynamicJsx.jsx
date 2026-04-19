import styles from './DynamicJsx.module.css';

export const DynamicJsx = ({ isActive }) => (
  <div className={styles[isActive ? 'usedClass' : 'usedClass2']}>
    Ternary in JSX
  </div>
);
