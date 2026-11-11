-- Migration 001: cria a tabela de tarefas.
CREATE TABLE tasks (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  done       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tasks_created_at_idx ON tasks (created_at DESC);
