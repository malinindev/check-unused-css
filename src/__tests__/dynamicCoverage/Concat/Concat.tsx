import styles from './Concat.module.css';

export const Concat = ({ x }: { x: string }) => {
  // biome-ignore lint/style/useTemplate: string concatenation is the case under test (out-of-scope -> coversAll)
  const cls = styles['btn-' + x];
  return <div className={cls} />;
};
