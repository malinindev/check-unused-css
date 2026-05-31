import s from './GenuineNonExistent.module.css';

// `toast` does not exist in the stylesheet and the module is not passed to a
// function, so it must still be reported as "used but non-existent".
export const GenuineNonExistent = () => (
  <div className={s.root}>
    <span className={s.toast} />
  </div>
);
