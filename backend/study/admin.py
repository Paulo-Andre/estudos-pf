from django.contrib import admin
from .models import StudyProfile,CompletedModule,StudyAnswer,SimulationRecord,StudyNote
for m in [StudyProfile,CompletedModule,StudyAnswer,SimulationRecord,StudyNote]: admin.site.register(m)
