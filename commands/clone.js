const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
		.setName('clone')
		.setDescription('clones a channel')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('the channel to clone')
				.setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(message) {
        
            let channel = message.options.getChannel('channel');

            let cloned;
            if (channel) {
                cloned = await channel.clone();
            }
            else {
                cloned = await message.channel.clone();
            }

            if (cloned) message.reply({ content: 'Alrighty <:AriSalute:1021920065802739752>', ephemeral: true });
            else message.reply('I might not have the permissions to manage channels'); 
    }
}