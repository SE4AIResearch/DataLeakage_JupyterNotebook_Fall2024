import z from 'zod';

export type Row = {
  id: number;
  gid: number;
  type: string;
  cause: string;
  cell: number;
  line: number;
  model: string;
  variable: string;
  method: string;
};

export function isRow(unk: unknown): unk is Row {
  const rowSchema = z.object({
    id: z.number(),
    gid: z.number(),
    type: z.string(),
    cause: z.string(),
    cell: z.number(),
    line: z.number(),
    model: z.string(),
    variable: z.string(),
    method: z.string(),
  });

  return rowSchema.safeParse(unk).success;
}
