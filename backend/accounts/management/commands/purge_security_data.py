from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import LoginAttempt,PasswordResetToken,SecurityEvent,TrackedSession

class Command(BaseCommand):
    help="Remove metadados de segurança antigos segundo uma política de retenção."

    def add_arguments(self,parser):
        parser.add_argument("--event-days",type=int,default=180)
        parser.add_argument("--revoked-session-days",type=int,default=30)
        parser.add_argument("--used-reset-days",type=int,default=7)

    def handle(self,*args,**options):
        now=timezone.now()
        event_cutoff=now-timedelta(days=max(30,options["event_days"]))
        session_cutoff=now-timedelta(days=max(7,options["revoked_session_days"]))
        reset_cutoff=now-timedelta(days=max(1,options["used_reset_days"]))
        events,_=SecurityEvent.objects.filter(created_at__lt=event_cutoff).delete()
        sessions,_=TrackedSession.objects.filter(revoked_at__isnull=False,revoked_at__lt=session_cutoff).delete()
        resets,_=PasswordResetToken.objects.filter(used_at__isnull=False,used_at__lt=reset_cutoff).delete()
        stale_attempts,_=LoginAttempt.objects.filter(updated_at__lt=now-timedelta(days=2)).delete()
        self.stdout.write(self.style.SUCCESS(
            f"Retenção aplicada: eventos={events}, sessões={sessions}, resets={resets}, tentativas={stale_attempts}"
        ))
