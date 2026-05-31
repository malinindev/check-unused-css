import s from './MixedDashCamelChain.module.css';

// Deepest leaf `listItem-active` referenced; both `list` and `listItem`
// (a camelCase concatenation) must be rescued.
export const MixedDashCamelChain = () => (
  <div className={s['listItem-active']} />
);
