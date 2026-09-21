from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AdminAuditLog
class AuditView(APIView):
    permission_classes=[permissions.IsAdminUser]
    def get(self,request):
        return Response([{"id":x.id,"actorUserId":x.actor_id,"affectedUserId":x.affected_user_id,"action":x.action,"detail":x.detail,"createdAt":x.created_at} for x in AdminAuditLog.objects.all()[:100]])
