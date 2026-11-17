import styles from './ScssPartialKeyframes.module.scss';

export const ScssPartialKeyframes = () => (
  <div
    className={styles.card}
    onAnimationEnd={(event) => {
      if (event.animationName === styles.fadeIn) return;
    }}
  />
);
