import s from './PropertyToFunction.module.css';

// A single property `s.root` is passed to a helper — that is a concrete,
// observable class reference, NOT a whole-object hand-off. The module must be
// analyzed normally, so `.orphan` must still be reported as unused.
declare const classNames: (...args: unknown[]) => string;

export const PropertyToFunction = ({ className }: { className?: string }) => (
  <div className={classNames(s.root, className)} />
);
