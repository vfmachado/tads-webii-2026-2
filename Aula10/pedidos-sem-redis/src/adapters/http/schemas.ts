import { z } from 'zod';
import type { PlaceOrderInput } from '../../application/commands/PlaceOrder.js';

/** HEXAGONAL: validação de FORMATO no adaptador HTTP (como na Aula 09). */
export const placeOrderSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().positive().max(10).default(1),
}) satisfies z.ZodType<PlaceOrderInput>;
