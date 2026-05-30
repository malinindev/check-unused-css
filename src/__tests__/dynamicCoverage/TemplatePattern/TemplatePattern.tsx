import styles from './TemplatePattern.module.css';

export const TemplatePattern = ({ x }: { x: string }) => {
  const cls = styles[`btn-${x}`];
  return <div className={`${cls} ${styles.card}`} />;
};
