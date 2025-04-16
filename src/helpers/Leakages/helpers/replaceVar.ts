import { INTERNAL_VARIABLE_NAME } from '../constants';
import { VarEquals } from '../types/types';
import { LeakageLines } from '../../../data/Leakages/types';

const isAnon = (v: string): boolean => /^_var\d+$/.test(v);

const renameAnonVar = (v: string): string =>
  isAnon(v) ? INTERNAL_VARIABLE_NAME : v;

const renameDuplicates = (model: string, lines: LeakageLines): string => {
  const regex = /_(\d+)$/;
  if (!regex.test(model)) {
    return model;
  }
  const modelTrimmed = model.replace(regex, '');
  const matched = model.match(regex);
  if (matched === null || matched[1] === undefined) {
    console.error(
      'Unknown error occurred while trying to match model ending digits.',
      matched,
      model,
      modelTrimmed,
    );
    return model;
  }
  const models = Object.values(lines)
    .map((line) => line.metadata?.model ?? null)
    .filter((model) => model !== null);
  return models.includes(modelTrimmed)
    ? `${modelTrimmed} (${matched[1]})`
    : model;
};

const getGroupForVariable = (
  v: string,
  varEquals: VarEquals,
): Set<string> | undefined => {
  const index = varEquals.equivalences[v];
  return index !== undefined ? varEquals.groups[index] : undefined;
};

const findExistingVariableInGroup = (
  group: Set<string>,
  line: string,
): string | undefined => {
  return [...group].find((value) => line.includes(value));
};

const handleVariableReplacement = (
  v: string,
  line: string,
  group: Set<string>,
  lines: LeakageLines,
): string => {
  const varsExist = findExistingVariableInGroup(group, line);
  if (varsExist) {
    console.log('Var Family Exists: ', v, group);
    return varsExist;
  }

  const removedEnd = v.replace(/_\d+$/, '');
  if (line.includes(removedEnd)) {
    console.log('Renamed duplicate variable: ', v, group);
    const res = renameDuplicates(v, lines);
    return res === v ? removedEnd : res;
  }
  console.error('Error - Unknown edge case found: ', v, varsExist, line);
  return v;
};

export const replaceVar = (
  v: string,
  lineNumberZeroBased: number,
  lines: LeakageLines,
  varEquals: VarEquals,
  pythonCodeArr: string[],
): string => {
  const line = pythonCodeArr[lineNumberZeroBased];
  const group = getGroupForVariable(v, varEquals);

  if (!group) {
    console.error(
      'Error - Variable not in varEquals or index does not exist in group',
    );
    return v;
  }

  if (line.includes(v)) {
    console.log('Variable Exists: ', v, group);
    return v;
  }

  if (isAnon(v)) {
    console.log('Variable is of type _varN: ', v, group);
    return renameAnonVar(v);
  }

  return handleVariableReplacement(v, line, group, lines);
};
