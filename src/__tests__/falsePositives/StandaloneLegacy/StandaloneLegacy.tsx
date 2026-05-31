import s from './StandaloneLegacy.module.css';

// `legacy` is a standalone class nothing references and is not part of any
// ampersand family, so it must still be reported as unused.
export const StandaloneLegacy = () => <div className={s.root} />;
