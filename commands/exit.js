const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const { lb, synclb } = require('../dbManager');
const pm2 = require('pm2');


module.exports = {
    data: new SlashCommandBuilder()
		.setName('exit')
		.setDescription('Kokomi goes to sleep'),
	async execute(interaction, client) {

		if (!JSON.parse(process.env.TRUSTED).includes(interaction.user.id)) return interaction.reply('Why would I listen to you?');
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
		// await client.destroy();
		// process.exit();
	}
}