# Backend Django — migração incremental

O backend Node/Express atual permanece ativo durante a transição.

## Esta fase inclui
- Django REST Framework + MySQL.
- Cadastro/login/logout e sessão Django.
- Migração automática de senha scrypt legada no primeiro login.
- Rate limit persistente no MySQL.
- Cursos e matrículas com ForeignKey/constraints.
- Endpoint de conteúdo protegido por matrícula.
- Progresso, respostas e anotações.
- Importador do núcleo legado com --dry-run.
- Storage Django independente do /manus-storage para novos arquivos.

## Executar
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

Antes de importar o banco real, faça backup e rode:
python manage.py import_legacy_core --dry-run

Só depois:
python manage.py import_legacy_core

O conteúdo TypeScript protegido ainda não foi removido nesta fase; ele deve ser importado para CourseContent e o React deve migrar para /api/v1 antes da remoção.
