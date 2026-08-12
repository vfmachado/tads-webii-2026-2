import type { Response } from 'express';

/**
 * Resultado que um Controller devolve para uma rota renderizar. Só existe
 * a variante "render" por enquanto — o template ainda não tem nenhum caso
 * de uso que termina em redirecionamento. Quando vocês implementarem
 * `POST /cards` (Atividade 1), muito provavelmente vão querer redirecionar
 * de volta para `/` após o sucesso (padrão Post/Redirect/Get); estender
 * este tipo (ou usar `res.redirect` diretamente na rota) faz parte da
 * atividade — é uma decisão de vocês, não deste template.
 */
export interface ControllerResult {
  status: number;
  view: string;
  locals: Record<string, unknown>;
}

export function respond(res: Response, result: ControllerResult): void {
  res.status(result.status).render(result.view, result.locals);
}
