# Repositório de laboratório com banco de dados local

Para criar um **novo repositório** de laboratório sem alterar o projeto original, execute:

```bash
pnpm laboratorio:criar
```

Por padrão, o repositório é criado como diretório irmão em `../estudos-pf-laboratorio`, já com um novo diretório `.git` e branch `main`. Para escolher outro local, forneça o caminho:

```bash
pnpm laboratorio:criar -- ../meu-laboratorio
```

O comando interrompe caso o destino já exista. Use `--force` apenas quando quiser substituir integralmente esse repositório:

```bash
pnpm laboratorio:criar -- ../meu-laboratorio --force
```

## Banco de dados

O novo repositório inclui `docker-compose.yml` com MySQL 8.4 e o banco `estudos_pf_laboratorio`. Na primeira inicialização, o MySQL executa as migrações SQL existentes em `drizzle/`, criando as tabelas da aplicação.

No repositório criado, execute:

```bash
cp .env.laboratorio.example .env
docker compose up -d
docker compose ps
pnpm install
pnpm dev
```

A aplicação se conecta ao MySQL local pela `DATABASE_URL` de `.env`, na porta `3307`. Para parar o banco, execute `docker compose down`; para remover inclusive os dados locais, execute `docker compose down -v`.

A cópia não inclui o Git original, `.env*`, `node_modules`, builds ou relatórios de cobertura. Assim, o código, o histórico e o banco de dados do laboratório ficam separados do projeto original.
