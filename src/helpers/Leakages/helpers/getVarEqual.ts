import fs from 'fs';
import { parse } from 'csv-parse';

import { VarEquals, Groups, Equivalences } from '../types/types';

export function getVarEqual(varEqualsCSVPath: string): Promise<VarEquals> {
  return new Promise((res, rej) => {
    const fileStream = fs.createReadStream(varEqualsCSVPath);
    const groups: Groups = [];
    const equivalences: Equivalences = {};

    // Initialize the parser with options
    const parser = parse({
      delimiter: '\t',
      skip_empty_lines: true,
    });

    // Pipe the file content to the parser
    fileStream.pipe(parser);

    // Process each record
    parser.on('data', (record: [string, string]) => {
      const [var1, var2] = record;
      if (
        equivalences[var1] === undefined &&
        equivalences[var2] === undefined
      ) {
        const index = groups.push(new Set([var1, var2])) - 1;
        equivalences[var1] = index;
        equivalences[var2] = index;
      } else if (
        equivalences[var1] === undefined &&
        equivalences[var2] !== undefined
      ) {
        const index = equivalences[var2];
        groups[index].add(var1);
        equivalences[var1] = index;
      } else if (
        equivalences[var1] !== undefined &&
        equivalences[var2] === undefined
      ) {
        const index = equivalences[var1];
        groups[index].add(var2);
        equivalences[var2] = index;
      }
    });

    // Handle errors
    parser.on('error', (err) => {
      console.error('Error parsing CSV:', err);
      rej(`Error parsing CSV:\n${err}`);
    });

    parser.on('end', () => {
      console.log('Groups: ', groups);
      console.log('Equivalences: ', equivalences);
      res({ groups, equivalences });
    });
  });
}
