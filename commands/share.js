const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../src/dbManager');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
		.setName('share')
		.setDescription('share a message through dms')
        .addSubcommand(subcommand => subcommand.setName('members').setDescription('share a message with selected members')
            .addStringOption(option => option.setName('message').setDescription('message you want to send').setMaxLength(2000).setRequired(true))
            .addStringOption(option => option.setName('users').setDescription('uids or mentionables').setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('feed').setDescription('share a message with anyone following your topic')
            .addStringOption(option => option.setName('topic').setDescription('select a topic').setMaxLength(64).setRequired(true))
            .addStringOption(option => option.setName('message').setDescription('message to share').setMaxLength(2000).setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {

        let users;
        if (interaction.options.getSubcommand() === 'feed') {
            if (!JSON.parse(process.env.TRUSTED).includes(interaction.user.id)) return interaction.reply("Don't bother me");
            users = await db.topic[interaction.options.getString('topic')];
            if (!users) return interaction.reply(`Topic "${interaction.options.getString('topic')}" doesn't exists.`);
        }
        else if (interaction.options.getSubcommand() === 'members') {
            users = interaction.options.getString('users').match(/\d+/g);
        }

        const fail = [];
        await interaction.reply({ content: "sending...", ephemeral: true });

        for (const uid of users) {
            const user = await interaction.client.users.fetch(uid);
            try {
                await user.send(interaction.options.getString('message').replace(/\s?\\n\s?/g, "\n"));
            } catch (e) {
                console.error("Cannot send messages to " + user.username);
                fail.push(user.username);
            }
        }

        if (!fail.length) {
            interaction.editReply({ content: "Shared message with " + users.length + " users. <:ZeroHappy:1038896873651572746>", ephemeral: true });
        }
        else {
            interaction.editReply({ content: "Cannot send messages to " + fail.join(', '), ephemeral: true });
        }
    }
}