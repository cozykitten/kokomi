const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
	name: 'on ping',
	description: "custom notification system",
	async execute(message, client) {

		const Server = client.guilds.cache.get(process.env.KOKOMI_HOME);
		const Channel = Server.channels.cache.get('882750410954276911');
		//Channel.send(message.content.slice(22).trim());

		const help_embed = new EmbedBuilder()
			.setAuthor({
                name: `${message.author.tag}`
            })
			.setTitle(`ping in ${message.channel.name}`)
			.setDescription(message.content.slice(22).trim())
			.setColor('#b6c6e2')
		Channel.send({ embeds: [help_embed] });

	}
}