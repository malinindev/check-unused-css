import s from './widget.module.css';

// Uses one child of the `--variant` family via a literal (rescues the parent),
// leaves `--variant-outline` and `deadCode` genuinely unused, and references a
// `ghost` class that the stylesheet does not define (genuine non-existent).
export const Widget = () => (
  <div className={s['--variant-faded']}>
    <span className={s.ghost} />
  </div>
);
