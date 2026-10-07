from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('club', '0003_newsarticle_image'),
    ]

    operations = [
        migrations.CreateModel(
            name='NewsGalleryImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='news/gallery/')),
                ('caption', models.CharField(blank=True, max_length=200)),
                ('article', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gallery_images', to='club.newsarticle')),
            ],
            options={
                'ordering': ['id'],
            },
        ),
    ]
