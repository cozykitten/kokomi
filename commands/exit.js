const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const { lb, synclb } = require('../dbManager');

module.exports = {
    data: new SlashCommandBuilder()
		.setName('exit')
		.setDescription('Kokomi goes to sleep'),
	async execute(message, client) {

		if (!JSON.parse(process.env.TRUSTED).includes(message.member.id)) return message.reply('Why would I listen to you?');
		await message.reply({ content: 'Good night! <:keqing_sleep:873683583468965978>', ephemeral: true});
		
		lb.lastexit = true;
		await synclb(lb);
		await client.destroy();
		process.exit();
	}
}