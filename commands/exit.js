const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();
const { reloadApplication, restartApplication, stopApplication } = require('../src/reloadManager');


module.exports = {
    data: new SlashCommandBuilder()
		.setName('exit')
		.setDescription('Kokomi goes to sleep')
		.addIntegerOption(option => option.setName('option').setDescription('reload commands or restart kokomi').addChoices(
			{ name: 'reload', value: 1 },
			{ name: 'restart', value: 2 }
		))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction) {

		if (!JSON.parse(process.env.TRUSTED).includes(interaction.user.id)) return interaction.reply('This command is not available for public usage.');

		if (interaction.options.getInteger('option') === 1) {
			await interaction.reply({ content: `I'll brb! <:AriSalute:1021920065802739752>`, ephemeral: true});
			reloadApplication(interaction.client);
			return;
		}
		else if (interaction.options.getInteger('option') === 2) {
			await interaction.reply({ content: `I'll brb! <:AriSalute:1021920065802739752>`, ephemeral: true});
			restartApplication(interaction.client);
			return;
		}

		await interaction.reply({ content: 'Good night! <:KeqingSleep:1038896867305603122>', ephemeral: true});
		await stopApplication(interaction.client);
		
		// console.log('exiting..');
		// lb.lastexit = true;
		// await synclb(lb);
		// await interaction.client.destroy();
		// process.exit();
	}
}