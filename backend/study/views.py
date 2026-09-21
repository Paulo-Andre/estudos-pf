from rest_framework.response import Response
from rest_framework.views import APIView
from courses.permissions import HasStudyAccess
from .models import StudyNote
from .services import answer,complete,state
class StateView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request):return Response(state(request.user))
class AnswerView(APIView):
    permission_classes=[HasStudyAccess]
    def post(self,request):return Response(answer(request.user,str(request.data.get("questionId") or "")[:80],bool(request.data.get("correct"))))
class CompleteView(APIView):
    permission_classes=[HasStudyAccess]
    def post(self,request):return Response(complete(request.user,str(request.data.get("moduleId") or "")[:80]))
class NoteView(APIView):
    permission_classes=[HasStudyAccess]
    def get(self,request,module_id):
        n=StudyNote.objects.filter(user=request.user,module_id=module_id).first()
        return Response(None if not n else {"moduleId":n.module_id,"content":n.content})
    def put(self,request,module_id):
        n,_=StudyNote.objects.update_or_create(user=request.user,module_id=module_id,defaults={"content":str(request.data.get("content") or "")[:12000]})
        return Response({"moduleId":n.module_id,"content":n.content})
