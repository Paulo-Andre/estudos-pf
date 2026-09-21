from django.contrib import admin
from .models import Course,CourseContent,CourseEnrollment
admin.site.register(Course)
admin.site.register(CourseEnrollment)
admin.site.register(CourseContent)
