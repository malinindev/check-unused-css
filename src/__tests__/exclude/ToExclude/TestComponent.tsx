import type React from 'react';
import styles from './TestComponent.module.css';

const TestComponent: React.FC = () => {
  return <div className={styles.usedClass}>Test Component To Exclude</div>;
};

export default TestComponent;
