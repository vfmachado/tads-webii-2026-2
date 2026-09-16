/**
 * HEXAGONAL: domínio (núcleo). Lista fechada dos nomes de módulo que
 * existem no sistema — usada pelo caso de uso `GrantModuleAccess` para
 * recusar conceder acesso a um módulo que não existe (evita que um erro
 * de digitação no nome do módulo crie uma concessão "fantasma", que nunca
 * vai satisfazer checagem nenhuma). Ao adicionar um módulo de negócio
 * novo (ex.: `billing`), este é o único lugar do módulo `access` que
 * precisa mudar.
 */
export const KNOWN_MODULES = ['projects', 'reports'] as const;
export type ModuleName = (typeof KNOWN_MODULES)[number];

const KNOWN_MODULE_SET: ReadonlySet<string> = new Set(KNOWN_MODULES);

export function isKnownModule(moduleName: string): boolean {
  return KNOWN_MODULE_SET.has(moduleName);
}
