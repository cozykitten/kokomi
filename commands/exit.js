const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();
const { reloadApplication, restartApplication } = require('../src/reloadManager');
const pm2 = require('pm2');


module.exports = {
    data: new SlashCommandBuilder()
		.setName('exit')
		.setDescription('Kokomi goes to sleep')
		.addIntegerOption(option => option.setName('reload').setDescription('reload commands').addChoices(
			{ name: 'reload', value: 1 }
		))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction) {

		if (!JSON.parse(process.env.TRUSTED).includes(interaction.user.id)) return interaction.reply('This command is not available for public useage.');

		if (interaction.options.getInteger('reload')) {
			await interaction.reply({ content: `I'll brb! <:AriSalute:1021920065802739752>`, ephemeral: true});
			reloadApplication(interaction.client);
			return;
		}

		await interaction.reply({ content: 'Good night! <:KeqingSleep:1038896867305603122>', ephemeral: true});


		pm2.connect(function (err) {
			if (err) {
				console.error(err);
				process.exit(2);
			}
			pm2.stop('ecosystem.config.js');
		});

		
		// console.log('exiting..');
		// lb.lastexit = true;
		// await synclb(lb);
		// await interaction.client.destroy();
		// process.exit();
	}
}