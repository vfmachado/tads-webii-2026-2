
DEFINICAO ORM

object relational mapping

    traduzir o modelo de dados para um modelo de objetos (codigo) e vice-versa

ORM
    - framework (tecnologia de persistencia) que faz a ponte entre o banco de dados e a aplicação - normalmente uma bilbioteca incluida no codigo fonte
    - estamos adicionando dependencias e uma camada extra na aplicação

OBJETIVOS e VANTAGENS DE UTILIZAR ORM
    - facilitar a manipulacao de dados (CRUD), joins, e etc
    - abstracao do banco de dados
    - produtividade, manutenibilidade
    - FACILIDADE EM MAPEAR OS RELACIONAMENTOS
    - SEGURANÇA - os ORMS eles sao utilizados e testados por milhares de pessoas.
    - MIGRATIONS - é uma forma de manter no código a evolução estrutural do banco de dados
    - Gerenciamento das conexões / pooling    

DESVANTAGENS
    - perda de performance (overhead)
    - queries geradas podem não ser otimizadas
    - dependendo do ORM e da sua implementação podemos perder (nao ter acesso com ORM) recursos do banco de dados (ex: stored procedures, triggers, etc)
    
    - acoplamento na aplicação (dependencia do ORM)
    - ter que aprender o ORM


DAO x REPOSITORY x QUERY BUILDER x ORM

DAO e REPOSITORY são padroes arquiteturais. é como utilizamos a tecnologia de acesso aos dados (sql puro / driver, query builder, orm)

QUERY BUILDER
    constrói queries de forma programatica, mas ainda é necessario conhecer a linguagem SQL


Exemplos de ORM
Prisma

TYPEORM
@Entity
class User {
    @Column
    name

    @Column
    @ManyToOne
    addressId
}


MIGRATION
    - é uma forma de manter no código a evolução estrutural do banco de dados
    - é um arquivo de código que descreve as alterações que devem ser feitas no banco de dados (ex: criar tabela, alterar coluna, etc)
    - é uma forma de versionar o banco de dados
    - é uma forma de garantir que todos os desenvolvedores da equipe estão utilizando a mesma versão do banco de dados
    - é uma forma de garantir que o banco de dados está em um estado consistente

SEED
    - é uma forma de popular o banco de dados com dados iniciais (ex: usuários, produtos, etc)
    - SAO ADICIOANDOS DADOS INICIAIS FUNDAMENTAIS PARA O FUNCIONAMENTO DO PROJETO, EXEMPLO DADOS DE CONFIGURAÇÃO
    - é um arquivo de código que descreve os dados que devem ser inseridos no banco de dados
    - é uma forma de garantir que todos os desenvolvedores da equipe estão utilizando os mesmos dados iniciais
    - é uma forma de garantir que o banco de dados está em um estado consistente


PRISMA GENERATE
    (nao sao todos ORMs que tem essa etapa)
    - é uma etapa que gera o código do client do ORM a partir do modelo de dados
    - é a partir do client que conseguimos UTILIZAR o banco