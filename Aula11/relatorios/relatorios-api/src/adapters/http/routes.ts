import { Router } from 'express';
import type { RequestReport } from '../../application/commands/RequestReport.js';
import type { GetReport, GetReportDownloadUrl, ListReports } from '../../application/queries/reportQueries.js';
import type { ReportView } from '../../application/views.js';
import { listQuerySchema, reportIdSchema, requestReportSchema } from './schemas.js';

/**
 * HEXAGONAL: adaptador primário HTTP. Fino: valida o formato, chama o
 * caso de uso e devolve o resultado.
 *
 * O ponto central da aula está no POST: `202 Accepted` em vez de `201`.
 * "Recebi o seu pedido, ainda não terminei." O header `Location` diz onde
 * consultar o andamento.
 */
export function createRoutes(useCases: {
  requestReport: RequestReport;
  getReport: GetReport;
  listReports: ListReports;
  getDownloadUrl: GetReportDownloadUrl;
}): Router {
  const router = Router();

  router.post('/reports', async (req, res) => {
    const input = requestReportSchema.parse(req.body);
    const report = await useCases.requestReport.execute(input);
    res.status(202).location(`/reports/${report.id}`).json(withLinks(report));
  });

  router.get('/reports', async (req, res) => {
    const { limit } = listQuerySchema.parse(req.query);
    res.json((await useCases.listReports.execute(limit)).map(withLinks));
  });

  router.get('/reports/:id', async (req, res) => {
    const { id } = reportIdSchema.parse(req.params);
    res.json(withLinks(await useCases.getReport.execute(id)));
  });

  // O link que vai no e-mail. Gera uma presigned URL nova e redireciona.
  router.get('/reports/:id/download', async (req, res) => {
    const { id } = reportIdSchema.parse(req.params);
    res.redirect(302, await useCases.getDownloadUrl.execute(id));
  });

  return router;
}

function withLinks(report: ReportView) {
  return {
    ...report,
    links: {
      self: `/reports/${report.id}`,
      ...(report.status === 'COMPLETED' ? { download: `/reports/${report.id}/download` } : {}),
    },
  };
}
