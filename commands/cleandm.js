const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
		.setName('cleandm')
		.setDescription('clean messages from DMs')
        .addIntegerOption(option => option.setName('amount').setDescription('amount of messages to delete'))
        .addStringOption(option => option.setName('id').setDescription('message id'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {

        if (!JSON.parse(process.env.TRUSTED).includes(message.member.id)) return message.reply('Why would I listen to you?');

        if (interaction.options.getString('id')) {
            
            const user = await client.users.fetch(interaction.member.id);
            if (user.dmChannel) {
                const m = await user.dmChannel.messages.fetch(interaction.options.getString('id'));
                await m.delete();
                interaction.reply({ content: "deleted", ephemeral: true });
            }
            else {
                const dm = await user.createDM();
                const m = await dm.messages.fetch(interaction.options.getString('id'));
                console.log(m)
                interaction.reply({ content: "deleted", ephemeral: true });
            }
        }
        else if (interaction.options.getInteger('amount')) {

            if (interaction.options.getInteger('amount') < 51) {

                const user = await client.users.fetch(interaction.member.id);
                if (user.dmChannel) {
                    const messages = await user.dmChannel.messages.fetch({ limit: interaction.options.getInteger('amount'), cache: false })
                    messages.forEach(msg => {
                        msg.delete();
                    });
                    interaction.reply({ content: "deleted", ephemeral: true });
                }
                else {
                    const dm = await user.createDM();
                    const messages = await dm.messages.fetch({ limit: interaction.options.getInteger('amount'), cache: false })
                    messages.forEach(msg => {
                        msg.delete();
                    });
                    //console.log(messages.toJSON())
                    interaction.reply({ content: "deleted", ephemeral: true });
                }
            }
            else return interaction.reply(`You can at most delete 50 messages at once.`);      
        }
        else return interaction.reply('Specify message ID or amount');
    }
}