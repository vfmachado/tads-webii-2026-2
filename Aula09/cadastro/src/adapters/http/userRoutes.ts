import { Router } from 'express';
import type { ListUsers } from '../../application/queries/ListUsers.js';
import type { RegisterUser } from '../../application/commands/RegisterUser.js';
import type { VerifyUser } from '../../application/commands/VerifyUser.js';
import { listUsersQuerySchema, registerUserSchema, verifyUserSchema } from './schemas.js';

/**
 * HEXAGONAL: adaptador primário (driving). Continua fino, mas agora a
 * validação de FORMATO é declarativa: `schema.parse(req.body)` transforma
 * o `unknown` que veio da rede em um objeto tipado — ou lança `ZodError`,
 * que o `errorHandler` traduz para 400.
 *
 * Compare com a Aula 08, que tinha um `requireStrings()` escrito à mão:
 * ele só sabia dizer "é string?" e precisava de um cast (`as`) no final.
 * Aqui o tipo de `input` é inferido do schema, sem cast nenhum.
 *
 * CQRS: as rotas de escrita (POST) chamam COMMANDS; a de leitura (GET)
 * chama uma QUERY. Para o HTTP a diferença é invisível — ele só precisa
 * saber qual objeto chamar.
 */
export function createUserRoutes(useCases: {
  registerUser: RegisterUser;
  verifyUser: VerifyUser;
  listUsers: ListUsers;
}): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const input = registerUserSchema.parse(req.body);
    const user = await useCases.registerUser.execute(input);
    res.status(201).json(user);
  });

  router.post('/verify', async (req, res) => {
    const input = verifyUserSchema.parse(req.body);
    const result = await useCases.verifyUser.execute(input);
    res.json(result);
  });

  router.get('/', async (req, res) => {
    const input = listUsersQuerySchema.parse(req.query);
    res.json(await useCases.listUsers.execute(input));
  });

  return router;
}
