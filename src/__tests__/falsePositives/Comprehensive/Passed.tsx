import s from './passed.module.css';

declare const responsiveClassNames: (
  styles: Record<string, string>,
  name: string,
  value: unknown
) => string[];

// The whole `passed.module.css` object is handed to a function → its module is
// ignored (no unused / non-existent reports for it), with a single warning.
export const Passed = ({ hide }: { hide: boolean }) => (
  <div className={responsiveClassNames(s, '--hidden', hide).join(' ')} />
);
