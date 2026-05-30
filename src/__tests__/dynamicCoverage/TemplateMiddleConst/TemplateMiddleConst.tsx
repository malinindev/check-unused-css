import styles from './TemplateMiddleConst.module.css';

export const TemplateMiddleConst = ({ x }: { x: string }) => {
  return <div className={styles[`a-${x}-b`]} />;
};
