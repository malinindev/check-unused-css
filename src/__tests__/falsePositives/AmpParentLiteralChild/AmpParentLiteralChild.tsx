import s from './AmpParentLiteralChild.module.css';

// Only the `faded` child is referenced (as a literal); `outline` is genuinely
// unused, and the parent `--variant` is never written directly.
export const AmpParentLiteralChild = () => (
  <div className={s['--variant-faded']} />
);
