import styles from './StringSimilarToUsage.module.css';

export const StringSimilarToUsage: React.FC = () => {
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text0 = 'styles';
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text1 = 'unusedClass';
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text2 = `styles['unusedClass2']`;
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text3 = `styles["unusedClass3"]`;

  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text4 = '[unusedClass4]';
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text5 = `['unusedClass5']`;
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text6 = `["unusedClass6"]`;

  // styles['unusedClass7']
  // styles["unusedClass8"]
  // unusedClass9
  // 'unusedClass10'
  // "unusedClass11"

  const emptyObj = {} as any;
  emptyObj.unusedClass12;
  // biome-ignore lint/complexity/useLiteralKeys: for test
  emptyObj['unusedClass13'];

  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text7 = `azaza styles['unusedClass14'] asf`;
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text8 = `azaza styles["unusedClass15"] asd`;
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text9 = "azaza styles['unusedClass16'] aa";
  // biome-ignore lint/correctness/noUnusedVariables: for test
  const text10 = 'azaza styles.unusedClass17 aa';

  // biome-ignore lint/correctness/noUnusedVariables: for test
  const constNameAsClass = null;
  // biome-ignore lint/style/noVar: for test
  // biome-ignore lint/correctness/noUnusedVariables: for test
  var varNameAsClass = null;
  // biome-ignore lint/style/useConst: for test
  // biome-ignore lint/correctness/noUnusedVariables: for test
  let letNameAsClass = null;

  return (
    <div className={styles.usedClass}>
      <div className={styles.usedClass2} />
      <div
        className={`globalClass ${styles.usedClass3} ${styles.usedClass4} globalClass2`}
      />
    </div>
  );
};
