const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../dbManager');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
		.setName('share')
		.setDescription('share info')
        .addStringOption(option => option.setName('topic').setDescription('select a topic').setRequired(true))
        .addStringOption(option => option.setName('content').setDescription('content to share').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {

        if (!JSON.parse(process.env.TRUSTED).includes(interaction.member.id)) return interaction.reply("Don't bother me");
        const topic = await db.topic[interaction.options.getString('topic')];
        if (topic) {

            const fail = [];
            await interaction.reply({ content: "sending...", ephemeral: true });

            for (const uid of topic) {
                const user = await client.users.fetch(uid);
                try {
                    await user.send(interaction.options.getString('content').replace(/\s?\\n\s?/g, "\n"));
                } catch (e) {
                    console.error("Cannot send messages to " + user.username);
                    fail.push(user.username);
                }
            }
            if (!fail.length) {
                interaction.editReply({ content: "Shared message with " + topic.length + " users. <:ZeroHappy:1038896873651572746>", ephemeral: true });
            }
            else {
                interaction.editReply({ content: "Cannot send messages to " + fail.join(', '), ephemeral: true });
            }
            
        }
        else {
            return interaction.reply(`Topic "${interaction.options.getString('topic')}" doesn't exists.`);
        }
    }
}