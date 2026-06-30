import styles from './ScssForward.module.scss';

// `.button` / `.button-primary` arrive transitively: the module `@use`s
// `_index.scss`, which `@forward`s `_buttons.scss`. `.wrapper` is local.
export const ScssForward = () => (
  <div
    className={[styles.wrapper, styles.button, styles['button-primary']].join(
      ' '
    )}
  />
);
