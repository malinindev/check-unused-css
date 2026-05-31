import s from './FamilyFullyUnused.module.css';

// No member of the `--size` family is referenced anywhere, so the parent AND
// every child must still be reported as unused (genuine finding). Only `used`
// keeps the module from being entirely empty of references.
export const FamilyFullyUnused = () => <div className={s.used} />;
