from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PasswordResetCode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("identifier", models.CharField(db_index=True, max_length=150)),
                ("channel", models.CharField(choices=[("email", "Email")], default="email", max_length=20)),
                ("code_hash", models.CharField(max_length=255)),
                ("reset_token_hash", models.CharField(blank=True, max_length=255)),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("expires_at", models.DateTimeField()),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="password_reset_codes", to="accounts.customuser")),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["identifier", "channel", "created_at"], name="accounts_pa_identif_d38122_idx"),
                    models.Index(fields=["user", "used_at", "expires_at"], name="accounts_pa_user_id_e7002a_idx"),
                ],
            },
        ),
    ]
