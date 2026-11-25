-- Migration 002: guarda QUANDO a tarefa foi concluída.
--
-- Mudança ADITIVA (coluna nova, opcional, sem default pesado): a versão
-- anterior da API continua funcionando com o banco já migrado. É isso que
-- torna possível o rollback da aplicação sem desfazer a migration.
-- (Padrão "expand/contract": primeiro expande, só depois remove o que sobrou.)
ALTER TABLE tasks ADD COLUMN done_at TIMESTAMPTZ;

UPDATE tasks SET done_at = created_at WHERE done = TRUE;
