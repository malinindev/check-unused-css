import styles from './WithDynamic.module.css';

const type = 'success';

// This uses dynamic class access which should trigger the --no-dynamic flag
const dynamicClass = styles[type];

export const WithDynamic = () => {
  return <div className={`${styles.usedClass} ${dynamicClass}`} />;
};
