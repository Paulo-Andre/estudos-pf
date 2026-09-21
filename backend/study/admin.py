from django.contrib import admin
from .models import CompletedModule,SimulationRecord,StudyAnswer,StudyContentProgress,StudyNote,StudyProfile,StudyReviewItem,StudyRoadmapItem
for m in [StudyProfile,CompletedModule,StudyAnswer,SimulationRecord,StudyNote,StudyReviewItem,StudyContentProgress,StudyRoadmapItem]:
    admin.site.register(m)
