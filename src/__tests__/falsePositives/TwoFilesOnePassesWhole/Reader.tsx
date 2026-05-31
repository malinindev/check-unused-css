import s from './shared.module.css';

// A second importer of the SAME module references a class that does not exist
// in the stylesheet. Because the module is ignored (the other file hands it to
// a function), this must NOT be reported as a non-existent class.
export const Reader = () => <div className={s.ghostMissing} />;
