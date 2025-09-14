import styles from './WithDynamicAndUnused.module.css';

const variant = 'primary';

// This uses dynamic class access AND has unused classes
const dynamicClass = styles[variant];

export const WithDynamicAndUnused = () => {
  return <div className={`${styles.usedClass} ${dynamicClass}`} />;
};
