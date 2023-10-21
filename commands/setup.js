const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db, sync } = require('../src/dbManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('set up channels for Kokomi')
        .addChannelOption(option => option.setName('modlog').setDescription('channel the bot should post logs to').setRequired(true))
        .addUserOption(option => option.setName('bully').setDescription("who you'd like to bully").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {

        const channel = interaction.options.getChannel('modlog');
        if (!(channel.type === 0 && channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages))) {
            return interaction.reply({ content: `Sorry, I can't send messages in ${channel.name}.`, ephemeral: true })
        }

        if (!db.serverConfig[interaction.guild.id]) {
            db.serverConfig[interaction.guild.id] = { name: interaction.guild.name }
        }
        else db.serverConfig[interaction.guild.id].name = interaction.guild.name;
        console.log(interaction.options.getChannel('modlog'))
        db.serverConfig[interaction.guild.id].modLog = interaction.options.getChannel('modlog').id;
        await sync(db);

        interaction.reply({ content: `Setup completed for ${interaction.guild.name}`, ephemeral: true })
    }
}