import z from 'zod';

export type Row = {
  type: string;
  cell: number;
  line: number;
  variable: string;
  cause: string;
};

export function isRow(unk: unknown): unk is Row {
  const rowSchema = z.object({
    type: z.string(),
    line: z.number(),
    variable: z.string(),
    cause: z.string(),
  });

  return rowSchema.safeParse(unk).success;
}
