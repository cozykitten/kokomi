const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const { lb, synclb } = require('../dbManager');

module.exports = {
    data: new SlashCommandBuilder()
		.setName('exit')
		.setDescription('Kokomi goes to sleep'),
	async execute(interaction, client) {

		if (!JSON.parse(process.env.TRUSTED).includes(interaction.member.id)) return interaction.reply('Why would I listen to you?');
		await interaction.reply({ content: 'Good night! <:KeqingSleep:1038896867305603122>', ephemeral: true});
		
		lb.lastexit = true;
		await synclb(lb);
		await client.destroy();
		process.exit();
	}
}