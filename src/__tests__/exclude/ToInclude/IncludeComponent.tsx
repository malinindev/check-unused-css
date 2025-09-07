import type React from 'react';
import styles from './IncludeComponent.module.css';

const IncludeComponent: React.FC = () => {
  return <div className={styles.usedClass}>Component To Include</div>;
};

export default IncludeComponent;
