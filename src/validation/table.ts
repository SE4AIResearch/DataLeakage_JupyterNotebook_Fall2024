import z from 'zod';

export type Row = {
  type: string;
  cell: number;
  line: number;
  model: string;
  variable: string;
  method: string;
};

export function isRow(unk: unknown): unk is Row {
  const rowSchema = z.object({
    type: z.string(),
    cell: z.number(),
    line: z.number(),
    model: z.string(),
    variable: z.string(),
    method: z.string(),
  });

  return rowSchema.safeParse(unk).success;
}
