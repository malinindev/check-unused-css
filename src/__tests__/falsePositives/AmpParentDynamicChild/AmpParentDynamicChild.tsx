import s from './AmpParentDynamicChild.module.css';

export const AmpParentDynamicChild = ({
  orientation,
}: {
  orientation: 'horizontal' | 'vertical';
}) => <div className={s[`--orientation-${orientation}`]} />;
