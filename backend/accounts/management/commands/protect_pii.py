from django.core.management.base import BaseCommand,CommandError
from django.db import transaction
from accounts.models import AccountProfile
from accounts.pii import get_profile_cpf,set_profile_cpf

class Command(BaseCommand):
    help="Criptografa CPFs legados em texto puro e limpa a coluna antiga."
    def add_arguments(self,parser):
        parser.add_argument("--strict",action="store_true")

    @transaction.atomic
    def handle(self,*args,**options):
        migrated=0
        failed=[]
        for profile in AccountProfile.objects.exclude(cpf__isnull=True).exclude(cpf="").iterator():
            try:
                cpf=get_profile_cpf(profile)
                set_profile_cpf(profile,cpf)
                profile.save(update_fields=["cpf","cpf_encrypted","cpf_hash","updated_at"])
                migrated+=1
            except Exception as exc:
                failed.append((profile.pk,str(exc)))
        if failed and options["strict"]:
            raise CommandError("Falha ao proteger PII: "+repr(failed[:20]))
        self.stdout.write(self.style.SUCCESS(f"PII protegida: {migrated}; falhas: {len(failed)}"))
