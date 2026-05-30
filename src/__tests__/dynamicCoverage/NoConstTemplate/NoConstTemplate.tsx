import styles from './NoConstTemplate.module.css';

export const NoConstTemplate = ({ x }: { x: string }) => {
  return <div className={styles[`${x}`]} />;
};
