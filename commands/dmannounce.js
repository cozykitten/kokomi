const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../dbManager');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dmannounce')
        .setDescription('share a message with selected users')
        .addStringOption(option => option.setName('message').setDescription('message you want to send').setRequired(true))
        .addStringOption(option => option.setName('users').setDescription('uids or mentionables').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {

        const users = interaction.options.getString('users').match(/\d+/g);


        const fail = [];
        await interaction.reply({ content: "sending...", ephemeral: true });

        for (const uid of users) {
            const user = await client.users.fetch(uid);
            try {
                //console.log(user.username)
                fail.push(user.username);
                //const sent = await user.send(interaction.options.getString('message').replace(/\s?\\n\s?/g, "\n"));
                //if (sent) {
                //    console.log('sent: ' + user.username);
                //}
            } catch (e) {
                console.error("Cannot send messages to " + user.username);
                //fail.push(user.username);
            }
        }

        if (!fail.length) {
            interaction.editReply({ content: "Shared message with " + users.length + " users. <:ZeroHappy:1038896873651572746>", ephemeral: true });
        }
        else {
            //interaction.editReply({ content: "Cannot send messages to " + fail.join(', '), ephemeral: false });
            interaction.editReply({ content: `${users.join("\n")}\n${users.length} members submitted total.\n\nusers fetched from client:\n${fail.join("\n")}\n${fail.length} members fetched successfully.`, ephemeral: true })
        }
    }
}

async function execute(interaction, client) {

    const users = interaction.options.getString('users').match(/\d+/g);

    const fail = [];
    await interaction.reply({ content: "sending...", ephemeral: true });

    for (const uid of users) {
        const user = await client.users.fetch(uid);
        try {
            const sent = await user.send(interaction.options.getString('message').replace(/\s?\\n\s?/g, "\n"));
            if (sent) {
                console.log('sent to: ' + user.username);//remove if and const sent
            }
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