import styles from './PassedAsPropValue.module.css';

// react-transition-group reads `classNames.appear`, `classNames.enter` and so
// on from the object it gets, so none of those classes are unused (#108).
declare const Modal: (props: {
  className?: string;
  transitionProps: { classNames: typeof styles };
}) => null;

export const SidePanel = () => (
  <Modal className={styles.modal} transitionProps={{ classNames: styles }} />
);
