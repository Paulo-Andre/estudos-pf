from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[("study","0004_learning_methodology")]
    operations=[
        migrations.CreateModel(
            name="SimulationReflection",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("confidence",models.PositiveSmallIntegerField(default=3)),
                ("primary_cause",models.CharField(choices=[("knowledge","Conteúdo"),("attention","Atenção"),("time","Tempo"),("interpretation","Interpretação"),("strategy","Estratégia")],max_length=24)),
                ("next_action",models.CharField(choices=[("review","Revisar erros"),("practice","Praticar questões"),("content","Retomar conteúdo"),("time_strategy","Treinar gestão de tempo"),("simulate","Novo simulado")],max_length=24)),
                ("note",models.CharField(blank=True,default="",max_length=600)),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("updated_at",models.DateTimeField(auto_now=True)),
                ("simulation",models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,related_name="reflection",to="study.simulationrecord")),
            ],
            options={
                "constraints":[models.CheckConstraint(condition=models.Q(confidence__gte=1,confidence__lte=5),name="reflection_confidence_valid")],
            },
        ),
    ]
