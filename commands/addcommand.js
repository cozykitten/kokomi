const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, EmbedBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, ButtonStyle } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const https = require('https');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcommand')
        .setDescription('add a new command to Kokomi')
        .addAttachmentOption(option => option.setName('command').setDescription('command file').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction, client) {

        //command may only be used by developer
        if (!JSON.parse(process.env.AUTHOR) === interaction.user.id) return interaction.reply('This command is not available for public useage.');

        const server = await client.guilds.cache.get(process.env.KOKOMI_HOME);
        const channel = await server.channels.cache.get(process.env.KOKOMI_LOG);

        const attachment = await interaction.options.getAttachment('command');
        const filePath = './commands/' + attachment.name;
        await interaction.deferReply({ ephemeral: true });

        if (fs.existsSync(filePath)) {

            console.log('File already exists');
            //return interaction.reply({ content: 'File already exists', ephemeral: true });

            const confirm = new ButtonBuilder()
                .setCustomId('confirm')
                .setLabel('Overwrite')
                .setStyle(ButtonStyle.Danger);

            const cancel = new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
                .addComponents(cancel, confirm);

            const response = await interaction.editReply({
                content: 'A file with that name already exists. Do you want to overwrite it?',
                components: [row],
                ephemeral: true
            });

            const collectorFilter = i => i.user.id === interaction.user.id;

            try {
                const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 15000 });

                if (confirmation.customId === 'confirm') {
                    console.log('Overwriting file...');
                    await confirmation.update({ content: 'Overwriting file...', components: [], ephemeral: true });

                    const file = fs.createWriteStream(filePath);
                    https.get(attachment.url, response => {
                        response.pipe(file);
                        file.on('finish', async () => {
                            file.close();
                            console.log('File downloaded successfully');
                            confirmation.editReply({ content: 'File downloaded successfully', components: [], ephemeral: true });
                            postLog(attachment.name, interaction.user.id, true, channel);
                        });
                    });

                } else if (confirmation.customId === 'cancel') {
                    return confirmation.update({ content: 'Download cancelled', components: [], ephemeral: true });
                }
            } catch (e) {
                logError(interaction.user.id, 'addcommand', 'trying to overwrite file', channel);
                return interaction.editReply({ content: 'Download cancelled due to inactivity', components: [], ephemeral: true });
            }

        }
        else {
            console.log('Downloading file...');
            interaction.editReply({ content: 'Downloading file...', ephemeral: true });

            const file = fs.createWriteStream(filePath);
            https.get(attachment.url, response => {
                response.pipe(file);
                file.on('finish', async () => {
                    file.close();
                    console.log('File downloaded successfully');
                    interaction.editReply({ content: 'File downloaded successfully', ephemeral: true });
                    postLog(attachment.name, interaction.user.id, false, channel);
                });
            });
        }
    }
};

async function postLog(file, userid, overwrite, log) {

    const embed = new EmbedBuilder()
        .setTitle('new command added')
        .setColor('#e4cf99');

    embed.data.fields = [{
        name: 'filename',
        value: file,
        inline: true
    }];

    embed.data.fields.push({
        name: 'sent by',
        value: '<@' + userid + '>',
        inline: true
    });

    embed.data.fields.push({
        name: 'overwrite',
        value: overwrite
    });
    
    log.send({ embeds: [embed] });
}

async function logError(userid, cmdName, location, channel) {

    const embed = new EmbedBuilder()
        .setTitle('error log')
        .setColor('#c43838');

    embed.data.fields = [{
        name: 'command',
        value: cmdName,
        inline: true
    }];

    embed.data.fields.push({
        name: 'requested by',
        value: '<@' + userid + '>',
        inline: true
    });

    embed.data.fields.push({
        name: 'catched in',
        value: location
    });

    channel.send({embeds: [embed] });
}