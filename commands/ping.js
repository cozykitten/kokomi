const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('ping Kokomi'),
	async execute(message){

		if (message.commandName) await message.reply({ content: 'did you expect me to say \'pong\' now?', ephemeral: true});
		else message.channel.send('did you expect me to say \'pong\' now?');

	}
}