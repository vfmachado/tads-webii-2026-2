import type { RequestHandler } from 'express';
import type { Permission } from '../kernel/Permission.js';

/**
 * HEXAGONAL: tipo compartilhado — a "forma" da função de autorização que
 * qualquer módulo de negócio pode exigir dos seus roteadores, sem precisar
 * importar nada do módulo `access`. A implementação real
 * (`createRequireModuleAccess`, em `modules/access/adapters/http/`) só é
 * conhecida pela composition root (`server.ts`), que a injeta em cada
 * módulo — é assim que `projects` e `reports` ficam protegidos por
 * autorização sem depender do módulo `access` diretamente.
 */
export type RequireModuleAccess = (moduleName: string, permission: Permission) => RequestHandler;
