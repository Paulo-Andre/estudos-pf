from django.contrib import admin
from .models import StudyBookmark,CompletedModule,SimulationRecord,SimulationReflection,StudyAnswer,StudyContentProgress,StudyNote,StudyProfile,StudyReviewItem,StudyRoadmapItem
for m in [StudyProfile,CompletedModule,StudyAnswer,SimulationRecord,SimulationReflection,StudyNote,StudyReviewItem,StudyContentProgress,StudyRoadmapItem]:
    admin.site.register(m)

admin.site.register(StudyBookmark)
