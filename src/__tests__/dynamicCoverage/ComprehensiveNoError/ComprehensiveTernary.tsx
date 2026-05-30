import styles from './Comprehensive.module.css';

// File 2 — ternaries of string literals (simple and nested). Every leaf is a
// literal, so all of active/inactive/small/medium/large resolve as used.
export const ComprehensiveTernary = ({
  on,
  size,
}: {
  on: boolean;
  size: number;
}) => {
  return (
    <div className={styles[on ? 'active' : 'inactive']}>
      <span
        className={
          styles[size === 1 ? 'small' : size === 2 ? 'medium' : 'large']
        }
      />
    </div>
  );
};
