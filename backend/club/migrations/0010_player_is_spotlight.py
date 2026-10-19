from django.db import migrations, models


class Migration(migrations.Migration):

	dependencies = [
		('club', '0009_player_bio_player_country_code_player_nationality_and_more'),
	]

	operations = [
		migrations.AddField(
			model_name='player',
			name='is_spotlight',
			field=models.BooleanField(default=False, help_text='Show this player in the homepage spotlight. Saving clears the selection from other players.', verbose_name='Player of the Match spotlight'),
		),
	]