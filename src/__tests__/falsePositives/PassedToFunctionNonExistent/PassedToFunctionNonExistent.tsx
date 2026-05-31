import s from './PassedToFunctionNonExistent.module.css';

declare const responsiveClassNames: (
  styles: Record<string, string>,
  name: string,
  value: unknown
) => string[];

// `s` is passed whole to a function AND `s.doesNotExist` is referenced. Because
// the module is ignored, the missing class must NOT be reported as non-existent
// (the tool cannot determine the real class set).
export const PassedToFunctionNonExistent = ({ on }: { on: boolean }) => (
  <div
    className={responsiveClassNames(s, '--x', on).join(' ')}
    data-x={s.doesNotExist}
  />
);
