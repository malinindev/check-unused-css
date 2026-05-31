import s from './DirectReadOnly.module.css';

// Only direct reads (member, bracket, template). The module is NOT passed to a
// function, so it must be analyzed normally and `.orphan` must be reported.
export const DirectReadOnly = ({ k }: { k: string }) => (
  <div className={s.root}>
    {/* biome-ignore lint/complexity/useLiteralKeys: the bracket-literal form is
        deliberately exercised as a "direct read that must not trigger ignore". */}
    <span className={s['icon']} />
    <span className={s[`icon-${k}`]} />
  </div>
);
