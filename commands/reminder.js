const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, sync } = require('../src/dbManager');
const ms = require('ms');
require('dotenv').config();


async function remindme(timestamp, client) {

    //build embed with db saved date and event name, send over client in dms
    const embed = new EmbedBuilder()
        .setTitle(`Reminder for ${getDate(db.reminder[timestamp].eventDate)}`)
        .setDescription('<:AriNotes:1038919832135024640> | ' + db.reminder[timestamp].event)
        .setColor(0x797FCB);

    try {
        const user = await client.users.fetch(db.reminder[timestamp].uid);
        await user.send({ embeds: [embed] });
    } catch (e) {
        console.error("Cannot send messages to user\nError in function 'remindme' of 'reminder.js'");
        await sendErrorLog(db.reminder[timestamp].uid);
        //since impossible to remind the receiver, try again in 1h and don't delete reminder
        setReminder(360000, timestamp, client);
        return;
    }

    //remove db entry as reminder is completed
    if (db.reminder) {

        const exists = await timestamp in db.reminder;
        if (exists) {
            if (db.reminder[timestamp].repeat) {
                const remindDate = timestamp + db.reminder[timestamp].repeat;
                const eventDate = db.reminder[timestamp].eventDate + db.reminder[timestamp].repeat;
                db.reminder[remindDate] = db.reminder[timestamp];
                db.reminder[remindDate].eventDate = eventDate;
                setReminder(db.reminder[timestamp].repeat, remindDate, client);
            }
            delete db.reminder[timestamp];
            sync(db);
        }
    }

    async function sendErrorLog(uid) {
        try {
            const server = await client.guilds.cache.get(process.env.KOKOMI_HOME);
            const channel = await server.channels.cache.get(process.env.KOKOMI_LOG);
            const user = await client.users.fetch(uid);
            await channel.send("Cannot send messages to " + user.username + "\n error in function 'sendErrorLog' in 'reminder.js'");
        } catch (error) {
            console.error('Error sending error log to home server {\n    ' + error + '\n}');
            return;
        }
    }
}

async function repeatTimeout(remindDate, client) {

    const date = Date.now();

    if (remindDate <= date) {
        remindme(remindDate, client);
    }
    else {
        const remindTime = remindDate - date;
        setReminder(remindTime, remindDate, client);
    }
    sync(db);
}

/**
 * 
 * @param {number} remindTime time until callback function is executed.
 * @param {number} remindDate key of the reminder object, also representing the timestamp of the remind Date.
 * @param {Discord.Client} client Discord Client.
 */
function setReminder(remindTime, remindDate, client) {
    if (remindTime > 2147483646) {
        const timeout = setTimeout(repeatTimeout, 2147400000, remindDate, client);
        db.reminder[remindDate].timeoutID = timeout[Symbol.toPrimitive]();
    }
    else {
        const timeout = setTimeout(remindme, remindTime, remindDate, client);
        db.reminder[remindDate].timeoutID = timeout[Symbol.toPrimitive]();
    }
}

function getDate(timestamp) {
    const date = new Date(timestamp);
    const formDate = date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
    return formDate;
}

function compareNumbers(a, b) {
    return a - b;
}

module.exports = {
    data: new SlashCommandBuilder()
		.setName('reminder')
		.setDescription('set a reminder')
        .addSubcommand(subcommand => subcommand.setName('add').setDescription('add a new reminder')
            .addStringOption(option => option.setName('event').setDescription('event title').setMaxLength(256).setRequired(true))
            .addStringOption(option => option.setName('time').setDescription('time relative to now (12d 15h 5m)').setMaxLength(16).setRequired(true))
            .addStringOption(option => option.setName('offset').setDescription('amount of time to remind before the event').setMaxLength(16))
            .addIntegerOption(option => option.setName('repeat').setDescription('repeat interval').addChoices(
                { name: 'Daily', value: 86400000 },
                { name: 'Weekly', value: 604800000 },
                { name: 'Bi-weekly', value: 1209600000 },
                { name: 'Monthly', value: 1 }
            )))
        .addSubcommand(subcommand => subcommand.setName('list').setDescription('view a list of your reminders'))
        .addSubcommand(subcommand => subcommand.setName('delete').setDescription('delete one of your reminders')
            .addStringOption(option => option.setName('event').setDescription('event the reminder is set for').setMaxLength(256).setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {

        if (!JSON.parse(process.env.TRUSTED).includes(interaction.user.id)) return interaction.reply("Don't bother me");

        if (interaction.options.getSubcommand() === 'add') {
            
            //split complex time (2d 12h) into subtimes and add up ms
            let eventTime = 0;
            const complexTime = interaction.options.getString('time').split(' ');
            for (const subTime of complexTime) {
                if (ms(subTime)) {
                    eventTime += ms(subTime);
                }
                else return interaction.reply({ content: 'not a valid time' });
            }

            let offset = 0;
            if (interaction.options.getString('offset')) {
                const complexOffset = interaction.options.getString('offset').split(' ');
                for (const subOffset of complexOffset) {
                    if (ms(subOffset)) {
                        offset += ms(subOffset);
                    }
                    else return interaction.reply({ content: 'not a valid offset time' });
                }
            }

            const remindTime = eventTime - offset;
            if (remindTime < 5000) {
                return interaction.reply({ content: 'Cannot set a reminder shorter than ``5s``' });
            }

            //calc future date & store in db
            const eventDate = Date.now() + eventTime;
            const remindDate = eventDate - offset;
            
            if (!db.reminder) {
                db.reminder = {};
            }

            db.reminder[remindDate] = {
                "uid": interaction.user.id,
                "event": interaction.options.getString('event'),
                "eventDate": eventDate
            }

            if (interaction.options.getInteger('repeat')) {
                const repeat = Number(interaction.options.getInteger('repeat'));
                if (repeat === 1) {
                    const now = new Date();
                    const repeat = 86400000 * new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
                    if (offset >= repeat) {
                        return interaction.reply({ content: 'offset time cam\'t be larger than repeat interval' });
                    }
                    db.reminder[remindDate].repeat = repeat;
                }
                else {
                    if (offset >= repeat) {
                        return interaction.reply({ content: 'offset time cam\'t be larger than repeat interval' });
                    }
                    db.reminder[remindDate].repeat = repeat;
                }
            }

            setReminder(remindTime, remindDate, interaction.client);
            sync(db);
            interaction.reply({ content: `<:AriNotes:1038919832135024640> I set a reminder for \`\`${interaction.options.getString('event')}\`\` in \`\`${ms(remindTime, { long: true })}\`\``, ephemeral: true });
        }
        else if (interaction.options.getSubcommand() === 'list') {

            if (!db.reminder) {
                return interaction.reply({ content: 'You didn\'t set any reminders' })
            }

            let dateList = [];
            const reminderList = [];
            const dateEventMatch = {};
            
            for (const key in db.reminder) {
                if (db.reminder[key].uid !== interaction.user.id) continue;
                dateList.push(db.reminder[key].eventDate);
                dateEventMatch[db.reminder[key].eventDate] = db.reminder[key].event;
            }

            dateList.sort(compareNumbers);
            for (eventDate of dateList) {
                const date = new Date(eventDate);
                reminderList.push(date.getDate() + '.' + (date.getMonth() + 1) + '.' + ' | ' + dateEventMatch[eventDate]);
            }

            if (reminderList.length <= 0) {
                return interaction.reply({ content: 'You didn\'t set any reminders' })
            }

            const replyEmbed = new EmbedBuilder()
                .setTitle('Your set reminders')
                .setDescription(reminderList.join('\n'))
                .setColor(0x797FCB)
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
    
                const remindDate = Number(key);
                if (remindDate <= date) {
                    remindme(remindDate, client);
                }
                else {
                    const remindTime = remindDate - date;
                    setReminder(remindTime, remindDate, client);
                }
            }
            sync(db);
        }
    }
}