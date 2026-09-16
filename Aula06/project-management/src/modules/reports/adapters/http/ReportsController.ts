import type { Request, Response } from 'express';
import type { GetProjectsSummary } from '../../application/useCases/GetProjectsSummary.js';

/**
 * HEXAGONAL: adaptador primário (driving/in adapter) do módulo `reports`.
 * O módulo inteiro existe para mostrar que a mesma peça de autorização
 * (`requireModuleAccess`) e o mesmo estilo de composição funcionam para
 * um segundo módulo de negócio, sem copiar lógica nem criar acoplamento
 * novo com `access`.
 */
export class ReportsController {
  constructor(private readonly getProjectsSummary: GetProjectsSummary) {}

  summary(_req: Request, res: Response): void {
    res.json(this.getProjectsSummary.execute());
  }
}
