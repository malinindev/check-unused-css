import s from './ignored.module.css';
import t from './analyzed.module.css';

declare const responsiveClassNames: (
  styles: Record<string, string>,
  name: string,
  value: unknown
) => string[];

// `s` is passed whole → its module is ignored. `t` is only read directly → its
// module is analyzed normally: `.tOrphan` is genuinely unused, and `t.missing`
// references a class absent from `analyzed.module.css` (genuine non-existent).
export const TwoModulesOneIgnored = ({ on }: { on: boolean }) => (
  <div className={responsiveClassNames(s, '--passed', on).join(' ')}>
    <span className={t.used} />
    <span className={t.missing} />
  </div>
);
