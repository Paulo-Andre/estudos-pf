from django.contrib import admin
from .models import Content,ContentChangelog,CourseDiscipline,Discipline,DisciplineContent,Question,QuestionChangelog,QuestionContentLink,ReviewQueue,SimulationQuestion
for model in [Discipline,Content,Question,CourseDiscipline,DisciplineContent,QuestionContentLink,ReviewQueue,QuestionChangelog,ContentChangelog,SimulationQuestion]:
    admin.site.register(model)
