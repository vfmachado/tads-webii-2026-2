import { z } from 'zod';
import type { RequestReportInput } from '../../application/commands/RequestReport.js';
import { CATEGORIES, REGIONS } from '../../domain/ReportFilters.js';

/**
 * HEXAGONAL: validação de FORMATO no adaptador HTTP (como na Aula 09).
 * A regra "período de no máximo um ano" é do domínio (`ReportFilters.ts`).
 */
export const requestReportSchema = z.object({
  email: z.email(),
  filters: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
    region: z.enum(REGIONS).optional(),
    category: z.enum(CATEGORIES).optional(),
  }),
}) satisfies z.ZodType<RequestReportInput>;

export const reportIdSchema = z.object({ id: z.uuid() });

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(50),
});
