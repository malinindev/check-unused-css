import styles from './KeyframeNames.module.css';

export const KeyframeNames = () => (
  <div
    className={styles.card}
    onAnimationEnd={(event) => {
      if (event.animationName === styles.ghostCardSlideIn) return;
      if (event.animationName === styles.spin) return;
      if (event.animationName === styles.pulse) return;
      if (event.animationName === styles.globalFade) return;
    }}
  />
);
