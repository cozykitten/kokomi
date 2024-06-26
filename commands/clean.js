const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();


/**
 * Deletes a message by the id given as interaction option.
 * 
 * @param {ChatInputCommandInteraction} interaction The interaction triggering the command.
 * @returns {Promise <(Message|InteractionResponse)>} 
 */
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

/**
 * Deletes multiple messages.
 * Depending on the age of the messages this function may use bulkDelete to immediately delete all messages
 * or delete every message iteratively.
 * 
 * @param {ChatInputCommandInteraction} interaction The interaction triggering the command.
 * @returns {Promise<void>}
 */
async function deleteMessageAmount(interaction) {
	/** @type string[] */
	const exclusionIds = interaction.options.getString('exclude') ? interaction.options.getString('exclude').split(' ') : [];
    let messages;
    if (interaction.options.getUser('user')) {

        messages = await interaction.channel.messages.fetch({ limit: 100, cache: false });
        const id = interaction.options.getUser('user').id;

        messages = messages.filter(function (m) {
            if (this.count < interaction.options.getInteger('amount') && m.author.id === id && !exclusionIds.includes(m.id)) {
                this.count++;
                return true;
            }
            return false;
        }, { count: 0 });
    }
    else {
        messages = await interaction.channel.messages.fetch({ limit: interaction.options.getInteger('amount') + exclusionIds.length, cache: false });
		messages = messages.filter(function (m) {
            if (exclusionIds.includes(m.id)) return false;
            return true;
        });
    }

    if (messages.size && messages.at(-1).createdTimestamp + 1209000000 > Date.now()) {
        await interaction.channel.bulkDelete(messages, true);
        await interaction.reply({ content: `Deleted messages.`, ephemeral: true });
        return;
    }

    await interaction.reply({ content: `Deleting...`, ephemeral: true });
    const deletePromises = messages.map(async (msg) => {
        if (msg.deletable) {
            await msg.delete();
        }
    });
    await Promise.all(deletePromises);
    interaction.editReply({ content: `Deleted messages.`, ephemeral: true });
}

/**
 * Deletes multiple messages from a DM channel.
 * Messages in DM channels cannot be bulk deleted.
 * 
 * @param {ChatInputCommandInteraction} interaction The interaction triggering the command.
 * @returns {Promise<void>}
 */
async function deleteMessageAmountDM(interaction) {
    await interaction.deferReply({ ephemeral: true });
    let messages = await interaction.channel.messages.fetch({ limit: 100, cache: false });
	const exclusionIds = interaction.options.getString('exclude') ? interaction.options.getString('exclude').split(' ') : [];
	const id = process.env.CLIENT_ID;

	messages = messages.filter(function (m) {
		if (this.count < interaction.options.getInteger('amount') && m.author.id === id && !exclusionIds.includes(m.id)) {
            this.count++;
            return true;
        }
        return false;
    }, { count: 0 });
    
    await interaction.editReply({ content: `Deleting...`, ephemeral: true });
    const deletePromises = messages.map(async (msg) => {
        await msg.delete();
    });
    await Promise.all(deletePromises);
    interaction.editReply({ content: `Deleted messages.`, ephemeral: true });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clean')
        .setDescription('clean messages from text channels')
        .addIntegerOption(option => option.setName('amount').setDescription('amount of messages to delete').setMaxValue(100).setMinValue(1))
        .addStringOption(option => option.setName('id').setDescription('message id').setMaxLength(20))
        .addUserOption(option => option.setName('user').setDescription('user mentionable'))
		.addStringOption(option => option.setName('exclude').setDescription('message ids of messages to exclude'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(true),

    async execute(interaction) {

        if (interaction.options.getString('id')) {
            await deleteMessageId(interaction);
        }
        else if (interaction.options.getInteger('amount')) {
            if (interaction.inGuild()) {
                await deleteMessageAmount(interaction);     
            }
            else {
                await deleteMessageAmountDM(interaction);
            }
        }
        else return interaction.reply('Specify message ID or amount');
    }
}