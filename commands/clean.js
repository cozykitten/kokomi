const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();


async function deleteMessageId(interaction) {
    try {
        const m = await interaction.channel.messages.fetch(interaction.options.getString('id'));
        if (m.deletable) {
            const msg = await m.delete();
            return interaction.reply({ content: `Deleted message from ${msg.author.username}`, ephemeral: true });
        }
        else {
            return interaction.reply({ content: "I can't delete this message.", ephemeral: true })
        }
    } catch (error) {
        return interaction.reply({ content: "Invalid message id.", ephemeral: true })
    }
}

async function deleteMessageAmount(interaction) {

    let messages;
    if (interaction.options.getUser('user')) {

        messages = await interaction.channel.messages.fetch({ limit: 100, cache: false });
        const id = interaction.options.getUser('user').id;

        messages = messages.filter(function (m) {
            if (this.count < interaction.options.getInteger('amount') && m.author.id === id) {
                this.count++;
                return true;
            }
            return false;
        }, { count: 0 });
    }
    else {
        messages = await interaction.channel.messages.fetch({ limit: interaction.options.getInteger('amount'), cache: false });
    }

    if (messages.size && messages.at(-1).createdTimestamp + 1209000 > Date.now()) {
        await interaction.channel.bulkDelete(messages, true);
        await interaction.reply({ content: `Deleted messages.`, ephemeral: true });
        return;
    }

    let count = 0;
    await interaction.reply({ content: `Deleting...`, ephemeral: true });
    for (const [id, msg] of messages) {
        if (msg.deletable) {
            await msg.delete();
            count++;
        }
    }
    await interaction.editReply({ content: `Deleted ${count} messages.`, ephemeral: true });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clean')
        .setDescription('clean messages from guild text channels')
        .addIntegerOption(option => option.setName('amount').setDescription('amount of messages to delete').setMaxValue(100).setMinValue(1))
        .addStringOption(option => option.setName('id').setDescription('message id'))
        .addUserOption(option => option.setName('user').setDescription('user mentionable'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false),

    async execute(interaction) {

        if (interaction.options.getString('id')) {

            await deleteMessageId(interaction);
        }
        else if (interaction.options.getInteger('amount')) {

            if (interaction.options.getInteger('amount') < 101) {

                await deleteMessageAmount(interaction);
            }
            else return interaction.reply(`You can at most delete 50 messages at once.`);      
        }
        else return interaction.reply('Specify message ID or amount');
    }
}