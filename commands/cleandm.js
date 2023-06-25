const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();
//TODO: combine with clean.js, just check first if we're in a dmChannel or a guildChannel

async function deleteMessageId(dm, interaction) {
    try {
        const m = await dm.messages.fetch(interaction.options.getString('id'));
        if (m.author.id === process.env.CLIENT_ID) {
            await m.delete();
            return interaction.reply({ content: "deleted", ephemeral: true });
        }
        return interaction.reply({ content: "I can't delete messages sent by you.", ephemeral: true })
    } catch (error) {
        return interaction.reply({ content: "Invalid message id.", ephemeral: true })
    }
}

async function deleteMessageAmount(dm, interaction) {
    const messages = await dm.messages.fetch({ limit: interaction.options.getInteger('amount'), cache: false });
    const deletePromises = messages.map(async (msg) => {
        if (msg.author.id === process.env.CLIENT_ID) {
            await msg.delete();
        }
    });
    await Promise.all(deletePromises);
    interaction.editReply({ content: `Deleted messages.`, ephemeral: true });
}

module.exports = {
    data: new SlashCommandBuilder()
		.setName('cleandm')
		.setDescription('clean messages from DMs')
        .addIntegerOption(option => option.setName('amount').setDescription('amount of messages to delete').setMaxValue(100).setMinValue(1))
        .addStringOption(option => option.setName('id').setDescription('message id').setMaxLength(20)),

    async execute(interaction) {

        if (interaction.inGuild()) return interaction.reply('This command is DM only.');

        if (interaction.options.getString('id')) {
            
            const user = await interaction.client.users.fetch(interaction.user.id);
            if (user.dmChannel) {
                await deleteMessageId(user.dmChannel, interaction);
            }
            else {
                const dm = await user.createDM();
                await deleteMessageId(dm, interaction);               
            }
        }
        else if (interaction.options.getInteger('amount')) {

            if (interaction.options.getInteger('amount') < 51) {

                const user = await interaction.client.users.fetch(interaction.user.id);
                if (user.dmChannel) {
                    await interaction.deferReply({ ephemeral: true });
                    await deleteMessageAmount(user.dmChannel, interaction);
                }
                else {
                    const dm = await user.createDM();
                    await interaction.deferReply({ ephemeral: true });
                    await deleteMessageAmount(dm, interaction);
                }
            }
            else return interaction.reply(`You can at most delete 50 messages at once.`);      
        }
        else return interaction.reply('Specify message ID or amount');
    }
}