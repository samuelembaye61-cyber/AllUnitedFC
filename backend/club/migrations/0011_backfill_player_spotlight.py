from django.db import migrations


def select_existing_spotlight(apps, schema_editor):
	Player = apps.get_model('club', 'Player')
	if Player.objects.filter(is_spotlight=True).exists():
		return

	players = Player.objects.order_by('number', 'name')
	player = players.filter(bio__gt='', photo__gt='').first()
	player = player or players.filter(bio__gt='').first() or players.first()
	if player:
		Player.objects.filter(pk=player.pk).update(is_spotlight=True)


class Migration(migrations.Migration):

	dependencies = [
		('club', '0010_player_is_spotlight'),
	]

	operations = [
		migrations.RunPython(select_existing_spotlight, migrations.RunPython.noop),
	]