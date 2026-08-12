import type { CardRepository } from './CardRepository.js';
import type { BoardRepository } from '../boards/BoardRepository.js';
import type { ControllerResult } from '../shared/http.js';
import { NotImplementedError } from '../shared/errors.js';

/**
 * CONTROLLER — nenhum método está implementado ainda. Isso é proposital:
 * cada método corresponde a uma atividade proposta na Aula 03 (ver
 * aula03.md). O construtor já recebe os dois repositórios que vocês vão
 * precisar — `cardRepository` para persistir cartões, `boardRepository`
 * para validar que uma coluna existe antes de criar/mover um cartão nela.
 */
export class CardController {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly boardRepository: BoardRepository,
  ) {}

  /**
   * TODO (Atividade 1): criar um cartão a partir do corpo da requisição
   * (`{ title, columnId, priority?, description? }`) e redirecionar de
   * volta para `/`. Regras a aplicar: título válido (`Card.create` já
   * valida), coluna precisa existir no quadro (`boardRepository`), e não
   * pode haver título duplicado na mesma coluna (Atividade 6 — podem
   * implementar já aqui ou depois, é a mesma regra).
   */
  create(_body: unknown): ControllerResult {
    throw new NotImplementedError('CardController#create');
  }

  /**
   * TODO (Atividade 2): mover um cartão para outra coluna
   * (`{ columnId }` no corpo). Regras: coluna destino precisa existir;
   * respeitar o limite de WIP da coluna destino (Atividade 5).
   */
  move(_id: string, _body: unknown): ControllerResult {
    throw new NotImplementedError('CardController#move');
  }

  /**
   * TODO (Atividade 3): editar título/descrição/prioridade de um cartão
   * existente (`{ title?, description?, priority? }`).
   */
  update(_id: string, _body: unknown): ControllerResult {
    throw new NotImplementedError('CardController#update');
  }

  /** TODO (Atividade 4): excluir um cartão existente. */
  remove(_id: string): ControllerResult {
    throw new NotImplementedError('CardController#remove');
  }

  /** TODO (Atividade 8, estica): página de detalhe de um cartão. */
  showDetail(_id: string): ControllerResult {
    throw new NotImplementedError('CardController#showDetail');
  }

  /** TODO (Atividade 9, estica): buscar cartões por título (`?query=`). */
  search(_query: unknown): ControllerResult {
    throw new NotImplementedError('CardController#search');
  }
}
