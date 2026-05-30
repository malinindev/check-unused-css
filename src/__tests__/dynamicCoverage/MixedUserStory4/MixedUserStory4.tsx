import styles from './MixedUserStory4.module.css';

export const MixedUserStory4 = ({
  on,
  name,
}: {
  on: boolean;
  name: string;
}) => {
  return (
    <div className={styles.header}>
      <span className={styles[on ? 'active' : 'inactive']} />
      <i className={styles[`icon-${name}`]} />
    </div>
  );
};
