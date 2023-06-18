const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();


module.exports = {
    data: new SlashCommandBuilder()
        .setName('timestamp')
        .setDescription('creates a timestamp based on a date you provide')
        .addStringOption(option => option.setName('date').setDescription('date in yyyy mm dd HHMM').setMaxLength(15).setRequired(true))
        .addIntegerOption(option => option.setName('utc').setDescription('utc offset as -6 for CST').setMaxValue(12).setMinValue(-12))
        .setDMPermission(true),

    async execute(interaction) {

        const match = /\d{4} \d{2} \d{2}( \d{4})?/g.exec(interaction.options.getString('date'));
        if (!match) {
            return interaction.reply({ content: `Please enter a date in ''date in yyyy mm dd HHMM'' format.`, ephemeral: true });
        }

        let utcOffset = 'Z';
        if (interaction.options.getInteger('utc')) {
            const n = interaction.options.getInteger('utc');
            utcOffset = (n<0?'':'+') + n.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false }) + ':00';
        }

        const d = match[0].split(' ');

        let formatDate;
        if (d[3]) {
            d[3] = d[3].slice(0, 2) + ':' + d[3].slice(2);
            formatDate = d[0] + '-' + d[1] + '-' + d[2] + 'T' + d[3] + utcOffset;
        }
        else {
            formatDate = d[0] + '-' + d[1] + '-' + d[2] + 'T00:00' + utcOffset;
        }

        const date = new Date(formatDate);
        interaction.reply({ content: '``<t:' + date.getTime() / 1000 + '>``', ephemeral: true });
    }
}