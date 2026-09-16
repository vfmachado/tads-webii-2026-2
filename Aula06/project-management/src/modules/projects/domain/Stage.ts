/**
 * HEXAGONAL: domínio (núcleo). Objeto de valor — uma etapa é só um nome.
 * A ORDEM das etapas dentro de um projeto é o que forma o "workflow"
 * configurável mencionado na aula: cada projeto define sua própria lista
 * ao ser criado (ver `Project.create`), em vez de existir um workflow
 * único e fixo para todos os projetos do sistema.
 */
export interface Stage {
  readonly name: string;
}
