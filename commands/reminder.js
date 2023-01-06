const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, sync } = require('../dbManager');
const ms = require('ms');
require('dotenv').config();

async function remindme(timestamp, client) {

    //build embed with db saved date and event name, send over client in dms
    const embed = new EmbedBuilder()
        .setTitle(`Reminder for ${getDate(timestamp)}`)
        .setDescription('<:AriNotes:1038919832135024640> | ' + db.reminder[timestamp].event)
        .setColor('#797FCB');

    const user = await client.users.fetch(db.reminder[timestamp].uid);
    try {
        await user.send({ embeds: [embed] });
    } catch (e) {
        console.error("Cannot send messages to " + user.username);
        const server = await client.guilds.cache.get(process.env.HOME); //use fetch
		const channel = await server.channels.cache.get(process.env.LOG);
        channel.send("Cannot send messages to " + user.username);
    }

    //remove db entry as reminder is completed
    if (db.reminder) {

        const exists = await timestamp in db.reminder;
        if (exists) {
            if (db.reminder[timestamp].repeat) {
                const fuDate = timestamp + db.reminder[timestamp].repeat;
                db.reminder[fuDate] = db.reminder[timestamp];
                setTimeout(remindme, db.reminder[timestamp].repeat, fuDate, client);
            }
            delete db.reminder[timestamp];
            sync(db);
        }
    }
}

function getDate(timestamp) {
    let date = new Date(timestamp);
    const formDate = date.getDate() + "." + date.getMonth() + "." + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
    return formDate;
}

module.exports = {
    data: new SlashCommandBuilder()
		.setName('reminder')
		.setDescription('set a reminder')
        .addSubcommand(subcommand => subcommand.setName('add').setDescription('add a new reminder')
            .addStringOption(option => option.setName('time').setDescription('time').setRequired(true))
            .addStringOption(option => option.setName('event').setDescription('event').setMaxLength(2000).setRequired(true))
            .addStringOption(option => option.setName('repeat').setDescription('repeat interval').addChoices(
                { name: 'Daily', value: '86400000' },
                { name: 'Weekly', value: '604800000' },
                { name: 'Bi-weekly', value: '1209600000' }
            )))
        .addSubcommand(subcommand => subcommand.setName('list').setDescription('view a list of your reminders'))
        .addSubcommand(subcommand => subcommand.setName('delete').setDescription('delete one of your reminders')
            .addStringOption(option => option.setName('event').setDescription('event the reminder is set for').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {

        if (!JSON.parse(process.env.TRUSTED).includes(interaction.user.id)) return interaction.reply("Don't bother me");

        if (interaction.options.getSubcommand() === 'add') {
            
            //split complex time (2d 12h) into subtimes and add up ms
            const complexTime = interaction.options.getString('time').split(' ');
            let time = 0;
            for (const subTime of complexTime) {
                if (ms(subTime)) {
                    time += ms(subTime)
                }
                else return interaction.reply({ content: 'not a valid time' });
            }

            if (time > 2147483646) {
                return interaction.reply({ content: 'Cannot set a reminder for longer than ``24d 18h``' });
            }
            if (time < 5000) {
                return interaction.reply({ content: 'Cannot set a reminder shorter than ``5s``' });
            }

            //calc future date & store in db
            const fuDate = Date.now() + time;
            
            if (!db.reminder) {
                db.reminder = {};
            }

            const timeout = setTimeout(remindme, time, fuDate, client);

            db.reminder[fuDate] = {
                "uid": interaction.user.id,
                "event": interaction.options.getString('event'),
                "timeoutID": timeout[Symbol.toPrimitive]()
            }

            if (interaction.options.getString('repeat')) {
                const interval = Number(interaction.options.getString('repeat'))
                db.reminder[fuDate].repeat = interval;
            }

            sync(db);
            interaction.reply({ content: `<:AriNotes:1038919832135024640> I set a reminder for \`\`${interaction.options.getString('event')}\`\` in \`\`${ms(time, { long: true })}\`\``, ephemeral: true });
        }
        else if (interaction.options.getSubcommand() === 'list') {

            if (!db.reminder) {
                return interaction.reply({ content: 'You didn\'t set any reminders' })
            }

            const reminderList = [];

            for (const key in db.reminder) {
                if (db.reminder[key].uid === interaction.user.id) {
                    reminderList.push(db.reminder[key].event);
                }
            }

            const replyEmbed = new EmbedBuilder()
                .setTitle('Your set reminders')
                .setDescription(reminderList.join('\n'))
                .setColor('#797FCB')
            interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        }
        else if (interaction.options.getSubcommand() === 'delete') {

            if (!db.reminder) {
                return interaction.reply({ content: 'You didn\'t set any reminders' })
            }

            for (const key in db.reminder) {
                if (db.reminder[key].uid !== interaction.user.id) continue;
                if (db.reminder[key].event === interaction.options.getString('event')) {
                    clearTimeout(db.reminder[key].timeoutID);
                    delete db.reminder[key];
                    sync(db);
                    return interaction.reply({ content: `<:AriSalute:1021920065802739752> I deleted your reminder for \`\`${interaction.options.getString('event')}\`\``, ephemeral: true });
                }
            }
            interaction.reply({ content: `You didn\'t set any reminders for \`\`${interaction.options.getString('event')}\`\`` })
        }
    },

    async loadReminders (client) { //check all past reminders and resolve them, and set timeouts for all open reminders
        if (db.reminder) {
    
            const date = Date.now();
            for (const key in db.reminder) {
    
                const fuDate = Number(key);
                if (fuDate <= date) {
                    remindme(fuDate, client);
                }
                else {
                    const timeout = setTimeout(remindme, fuDate - date, fuDate, client);
                    db.reminder[key].timeoutID = timeout[Symbol.toPrimitive]();
                }
            }
            sync(db);
        }
    }
}