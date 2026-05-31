import s from './MultiLevelMiddleUsed.module.css';

// Only the middle level is referenced; `--color` is rescued, but the deepest
// leaf `--color-primary-faded` is genuinely unused.
export const MultiLevelMiddleUsed = () => (
  <div className={s['--color-primary']} />
);
