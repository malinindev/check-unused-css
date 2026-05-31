import s from './PassedToFunctionUnused.module.css';

// The whole module object `s` is handed to a helper that builds class keys
// internally; the tool cannot see which classes are applied, so the module is
// ignored — `.--nowrap` must NOT be reported as unused.
declare const responsiveClassNames: (
  styles: Record<string, string>,
  name: string,
  value: unknown
) => string[];

export const PassedToFunctionUnused = ({ nowrap }: { nowrap: boolean }) => (
  <div className={responsiveClassNames(s, '--nowrap', nowrap).join(' ')} />
);
