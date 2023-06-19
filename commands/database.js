const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, ButtonStyle } = require('discord.js');
const fs = require('fs');
const https = require('https');
require('dotenv').config();


async function reloadApplication(client) {
    const { lb, synclb } = require('../dbManager');

    console.log('reloading application due to database update..');
	lb.lastexit = true;
	await synclb(lb);
	await client.destroy();
	process.exit();
}

async function getDatabase(interaction) {

    const attachment = await interaction.options.getAttachment('file');

    //checking if attachment is a json file
    if (!attachment.name.endsWith('.json')) {
        interaction.reply('Wrong file.');
        return false;
    }

    const filePath = './' + attachment.name;
    await interaction.deferReply({ ephemeral: true });


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
        content: 'Do you want to overwrite the existing database?',
        components: [row],
        ephemeral: true
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
        const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 15000 });

        if (confirmation.customId === 'confirm') {
            console.log('Overwriting database...');
            await confirmation.update({ content: 'Overwriting file...', components: [], ephemeral: true });

            const file = fs.createWriteStream(filePath);

            return new Promise((resolve) => {

                https.get(attachment.url, response => {
                    response.pipe(file);
                    file.on('finish', async () => {
                        file.close();
                        console.log('Database downloaded successfully');
                        confirmation.editReply({ content: 'Database downloaded successfully.\nReloading application...', components: [], ephemeral: true });
                        resolve(true);
                    });
                    file.on('error', () => {
                        resolve(false);
                    });
                });
            });

        } else if (confirmation.customId === 'cancel') {
            await confirmation.update({ content: 'Download cancelled', components: [], ephemeral: true });
            return false;
        }
    } catch (e) {
        await interaction.editReply({ content: 'Download cancelled due to inactivity or other error', components: [], ephemeral: true });
        return false;
    }
}

async function sendDatabase(interaction, client) {

    const server = await client.guilds.cache.get(process.env.KOKOMI_HOME);
	const channel = await server.channels.cache.get(process.env.KOKOMI_DATABASE);
    const file = await fs.promises.readFile('./words.json');

    await channel.send({ files: [{ attachment: file, name: 'words.json' }] });
    interaction.reply({ content: 'Database retrieved.', ephemeral: true });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('database')
        .setDescription('manage kokomi\'s database')
        .addIntegerOption(option => option.setName('mode').setDescription('update or retrieve kokomi\'s databse').addChoices(
            { name: 'retrieve', value: 0 },
            { name: 'update', value: 1 }
        ).setRequired(true))
        .addAttachmentOption(option => option.setName('file').setDescription('database file'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction, client) {

        //command may only be used by developer
        if (!JSON.parse(process.env.AUTHOR) === interaction.user.id) return interaction.reply('This command is not available for public useage.');

        if (interaction.options.getInteger('mode')) {
            //this part of the command is kinda ugly and unoptimised, and any .json file could be sent to the bot's directory, so it's disabled.
            return interaction.reply({ content: 'This feature is currently disabled. Please use SSH if possible.', ephemeral: true });

            if (!interaction.options.getAttachment('file')) return interaction.reply({ content: 'Please attach the database file to update my database.', ephemeral: true });
            const reloadRequired = await getDatabase(interaction);
            if (reloadRequired) reloadApplication(client);
        }
        else {
            await sendDatabase(interaction, client);
        }
    }
}