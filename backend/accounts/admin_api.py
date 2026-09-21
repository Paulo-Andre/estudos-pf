from django.contrib.auth import get_user_model
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AccountProfile
from .serializers import SafeUserSerializer
from study.models import StudyAnswer,SimulationRecord

class AdminUserListView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        qs=get_user_model().objects.all().order_by("-date_joined")[:100]
        return Response(SafeUserSerializer(qs,many=True).data)

class AdminStatsView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        return Response({"users":get_user_model().objects.count(),"blocked":AccountProfile.objects.filter(is_blocked=True).count(),
        "answers":StudyAnswer.objects.count(),"simulations":SimulationRecord.objects.count()})
