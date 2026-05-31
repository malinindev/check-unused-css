import s from './ComposedHandoff.module.css';

declare const classNames: (...args: unknown[]) => string;
declare const responsiveClassNames: (
  styles: Record<string, string>,
  name: string,
  value: unknown
) => string[];

// The real reshaped Button shape: the whole `s` is handed to the inner
// `responsiveClassNames` call, whose result flows into `classNames`. The object
// still escapes into a function we cannot analyze, so the module is ignored —
// `.--full-width` must NOT be reported as unused.
export const ComposedHandoff = ({ fullWidth }: { fullWidth: boolean }) => (
  <div
    className={classNames(
      s.root,
      responsiveClassNames(s, '--full-width', fullWidth)
    )}
  />
);
