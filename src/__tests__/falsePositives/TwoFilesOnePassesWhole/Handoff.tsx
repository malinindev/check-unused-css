import s from './shared.module.css';

declare const responsiveClassNames: (
  styles: Record<string, string>,
  name: string,
  value: unknown
) => string[];

// This importer hands the whole module to a function → the module is
// unanalyzable and must be ignored as a whole.
export const Handoff = ({ on }: { on: boolean }) => (
  <div className={responsiveClassNames(s, '--passed', on).join(' ')} />
);
