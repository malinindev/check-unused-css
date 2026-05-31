import s from './MixedPassAndDirect.module.css';

declare const responsiveClassNames: (
  styles: Record<string, string>,
  name: string,
  value: unknown
) => string[];

// Mixes a direct read (`s.root`) with a whole-object hand-off
// (`responsiveClassNames(s, ...)`). The hand-off makes the class set
// undeterminable, so the whole module is ignored regardless of the direct read;
// `.wouldBeUnused` must NOT be reported.
export const MixedPassAndDirect = ({ x }: { x: boolean }) => (
  <div className={s.root}>
    <span className={responsiveClassNames(s, '--x', x).join(' ')} />
  </div>
);
