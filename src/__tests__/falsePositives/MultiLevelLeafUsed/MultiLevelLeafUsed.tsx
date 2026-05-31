import s from './MultiLevelLeafUsed.module.css';

// Only the deepest leaf is referenced; both ancestors (`--color`,
// `--color-primary`) must be rescued.
export const MultiLevelLeafUsed = () => (
  <div className={s['--color-primary-faded']} />
);
