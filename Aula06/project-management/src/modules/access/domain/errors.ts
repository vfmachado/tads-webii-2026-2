/**
 * HEXAGONAL: domínio (núcleo) do módulo `access`. Erros de negócio
 * específicos deste módulo — erros de fronteira genéricos (validação,
 * autenticação, autorização) ficam em `shared/errors.ts` para não forçar
 * outros módulos a importar erros de domínio do `access` (ver o
 * cabeçalho de `shared/errors.ts`).
 */
export class UserNotFoundError extends Error {
  constructor(id: number) {
    super(`Usuário ${id} não encontrado`);
    this.name = 'UserNotFoundError';
  }
}

export class UnknownModuleError extends Error {
  constructor(moduleName: string) {
    super(`Módulo "${moduleName}" não existe`);
    this.name = 'UnknownModuleError';
  }
}
