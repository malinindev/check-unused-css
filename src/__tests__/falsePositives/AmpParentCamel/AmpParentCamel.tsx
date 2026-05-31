import s from './AmpParentCamel.module.css';

// `buttonBlack` is referenced directly; `buttonWhite` is genuinely unused, and
// the parent `button` is never written directly.
export const AmpParentCamel = () => <div className={s.buttonBlack} />;
