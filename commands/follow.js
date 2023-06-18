const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, sync } = require('../dbManager');

module.exports = {
    data: new SlashCommandBuilder()
		.setName('follow')
		.setDescription('follow a topic')
        .addBooleanOption(option => option.setName('list').setDescription('show a list of topics'))
        .addStringOption(option => option.setName('remove').setDescription('unfollow a topic').setMaxLength(64))
        .addStringOption(option => option.setName('topic').setDescription('select a topic').setMaxLength(64))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {

        if (interaction.options.getString('remove')) {

            const uids = await db.topic[interaction.options.getString('remove')];
            if (uids) {
                const index = await db.topic[interaction.options.getString('remove')].findIndex(id => id === interaction.user.id);
                if (index === -1) return interaction.reply({ content: "You aren't following this topic.", ephemeral: true });
                db.topic[interaction.options.getString('remove')].splice(index, 1);
                sync(db);
                return interaction.reply({ content: `You unfollowed "${interaction.options.getString('remove')}."`, ephemeral: true });
            }
            else {
                return interaction.reply(`Topic "${interaction.options.getString('remove')}" doesn't exists.`);
            }
        }

        if (interaction.options.getString('topic')) {

            const uids = await db.topic[interaction.options.getString('topic')];
            if (uids) {
                const index = await db.topic[interaction.options.getString('topic')].findIndex(id => id === interaction.user.id);
                if (index === -1) {
                    db.topic[interaction.options.getString('topic')].push(interaction.user.id);
                    sync(db);
                    return interaction.reply({ content: `You are now following "${interaction.options.getString('topic')}."`, ephemeral: true });
                }
                else return interaction.reply({ content: "You are already following this topic.", ephemeral: true });
            }
            else {
                return interaction.reply(`Topic "${interaction.options.getString('topic')}" doesn't exists.`);
            }
        }
        else if (interaction.options.getBoolean('list')) {

            const view_embed = new EmbedBuilder()
                .setTitle('Topics')
                .setDescription(`${Object.keys(await db.topic).join('\n')}`)
                .setColor('#797FCB')
            interaction.reply({ embeds: [view_embed] });
        }
        else return interaction.reply("You didn't select any option.");
    }
}