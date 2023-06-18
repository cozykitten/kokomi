const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, sync } = require('../dbManager');

function createEmbed(message) {
    const embed = new EmbedBuilder()
        .setTitle(message.options.getString('title'))
        .setDescription(message.options.getString('description'))
        .setColor(message.options.getString('color'))
        .setImage(message.options.getString('image'))
        .setAuthor({ name: message.options.getString('author'), iconURL: message.options.getString('author_icon') })
        .setFooter({ text: message.options.getString('footer'), iconURL: message.options.getString('footer_icon') })
        .setThumbnail(message.options.getString('thumbnail'));

    message.channel.send({ embeds: [embed] });
    return embed;
}

async function editEmbed(message, name) {

    const e_index = await retrieveIndex(name);
    if (e_index) {
        message.reply("I couldn't find an embed with that name");
        return false;
    }

    const attrib = ['title', 'description', 'color']
    const attrib_2 = ['image', 'thumbnail'];
    
    attrib.forEach(element => {
        if (message.options.getString(element)) {
            db.custom_embed[e_index].embed[element] = message.options.getString(element);
        }
    });

    attrib_2.forEach(element => {
        if (message.options.getString(element)) {
            db.custom_embed[e_index].embed[element].url = message.options.getString(element);
        }
    });
    
    if (message.options.getString('author')) {
        db.custom_embed[e_index].embed.author.name = message.options.getString('author');
    }
    if (message.options.getString('author_icon')) {
        db.custom_embed[e_index].embed.author.icon_url = message.options.getString('author_icon');
    }
    if (message.options.getString('footer')) {
        db.custom_embed[e_index].embed.footer.text = message.options.getString('footer');
    }
    if (message.options.getString('footer_icon')) {
        db.custom_embed[e_index].embed.footer.icon_url = message.options.getString('footer_icon');
    }
    sync(db);
    return db.custom_embed[e_index].embed;
}

async function retrieveIndex(name) {
    if (!db.custom_embed || !db.custom_embed[0]) {
        return false;
    } else {
        const index = await db.custom_embed.findIndex(list => list.name === name);
        if (index === -1) return false;
        else return index;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
		.setName('embed')
		.setDescription('creates, saves and sends embeds')
        .addSubcommand(subcommand => subcommand.setName('create').setDescription('create a new embed')
            .addStringOption(option => option.setName('description').setDescription('embed text').setMaxLength(4096).setRequired(true))
            .addStringOption(option => option.setName('title').setDescription('embed title').setMaxLength(256))
            .addStringOption(option => option.setName('color').setDescription('hex').setMaxLength(7))
            .addStringOption(option => option.setName('image').setDescription('image url'))
            .addStringOption(option => option.setName('author').setDescription('author name').setMaxLength(256))
            .addStringOption(option => option.setName('author_icon').setDescription('icon url'))
            .addStringOption(option => option.setName('footer').setDescription('footer text').setMaxLength(2048))
            .addStringOption(option => option.setName('footer_icon').setDescription('icon url'))
            .addStringOption(option => option.setName('thunbnail').setDescription('image url'))
            .addStringOption(option => option.setName('name').setDescription('save as').setMaxLength(256))
            .addChannelOption(option => option.setName('channel').setDescription('target channel')))
        .addSubcommand(subcommand => subcommand.setName('list').setDescription('display saved embeds'))
        .addSubcommand(subcommand => subcommand.setName('view').setDescription('view a saved embed')
            .addStringOption(option => option.setName('name').setDescription('embed name').setMaxLength(256).setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('send').setDescription('send a saved embed')
            .addStringOption(option => option.setName('name').setDescription('embed name').setMaxLength(256).setRequired(true))
            .addChannelOption(option => option.setName('channel').setDescription('target channel').setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('edit').setDescription('edit a saved embed')
            .addStringOption(option => option.setName('name').setDescription('embed name').setMaxLength(256).setRequired(true))
            .addStringOption(option => option.setName('description').setDescription('embed text').setMaxLength(4096))
            .addStringOption(option => option.setName('title').setDescription('embed title')).setMaxLength(256)
            .addStringOption(option => option.setName('color').setDescription('hex').setMaxLength(7))
            .addStringOption(option => option.setName('image').setDescription('image url'))
            .addStringOption(option => option.setName('author').setDescription('author name').setMaxLength(256))
            .addStringOption(option => option.setName('author_icon').setDescription('icon url'))
            .addStringOption(option => option.setName('footer').setDescription('footer text').setMaxLength(2048))
            .addStringOption(option => option.setName('footer_icon').setDescription('icon url'))
            .addStringOption(option => option.setName('thunbnail').setDescription('image url')))
        .addSubcommand(subcommand => subcommand.setName('update').setDescription('update a sent embed')
            .addStringOption(option => option.setName('name').setDescription('embed name').setMaxLength(256).setRequired(true))
            .addChannelOption(option => option.setName('channel').setDescription('source channel').setRequired(true))
            .addStringOption(option => option.setName('message').setDescription('message id').setMaxLength(18).setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('delete').setDescription('delete a saved embed')
            .addStringOption(option => option.setName('name').setDescription('embed name').setMaxLength(256).setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false),
    async execute(message) {

        const sub = message.options.getSubcommand();
        if (sub === 'create') {

            const e_embed = createEmbed(message);
            if (message.options.getChannel('channel')) {//send to channel

                const sent = await message.options.getChannel('channel').send({ embeds: [e_embed] });
                if (sent) message.reply({ content: 'embed sent', ephemeral: true });
                else message.reply('I might not have the permissions to send messages in this channel');
            }
            else if (message.options.getString('name')) {//save as name

                const index = await db.custom_embed.findIndex(list => list.name === message.options.getString('name'));
                if (index === -1) {

                    if (!db.custom_embed || !db.custom_embed[0]) {
                        db.custom_embed = [{
                            name: message.options.getString('name'),
                            embed: e_embed,
                        }]
                    } else {
                        db.custom_embed.push({
                            name: message.options.getString('name'),
                            embed: e_embed
                        })
                    }
                    sync(db);
                    message.reply(`I saved your embed as '${message.options.getString('name')}'`);
                }
                else {
                    return message.reply(`"${message.options.getString('name')}" already exists.\n`);
                }
            }
            else {
                return message.reply('You didn\'t select either a channel to send, or a name to save this embed to');
            }
        }
        else if (sub === 'delete') {

            const i = await retrieveIndex(message.options.getString('name'));
            if (i) {
                await db.custom_embed.splice(i, 1);
                sync(db);
                message.reply({ content: 'embed deleted', ephemeral: true });
            }
            else return message.reply('This embed doesn\'nt exist');
        }
        else if (sub === 'send') {

            const i = await retrieveIndex(message.options.getString('name'));
            if (i) {
                const e_embed = await db.custom_embed[i].embed;
                const sent = await message.options.getChannel('channel').send({ embeds: [e_embed] });
                if (sent) message.reply({ content: 'embed sent', ephemeral: true });
                else message.reply('I might not have the permissions to send messages in this channel');
            }
            else return message.reply('This embed doesn\'nt exist');
        }
        else if (sub === 'view') {

            const i = await retrieveIndex(message.options.getString('name'));
            if (i) {
                const e_embed = await db.custom_embed[i].embed;
                message.reply({ embeds: [e_embed] });
            }
            else return message.reply('This embed doesn\'nt exist');
        }
        else if (sub === 'edit') {
            const e_embed = await editEmbed(message, message.options.getString('name'))
            if (e_embed) message.reply({ content: `I updated ${message.options.getString('name')} to`, embeds: [e_embed] });            
        }
        else if (sub === 'update') {

            const i = await retrieveIndex(message.options.getString('name'));
            if (i) {
                const e_embed = await db.custom_embed[i].embed;
                const g_channel = message.options.getChannel('channel');
                const g_message = await g_channel.messages.fetch(message.options.getString('message'));

                g_message.edit({ embeds: [e_embed] });
                message.reply({ content: 'embed updated', ephemeral: true });
            }
            else return message.reply('This embed doesn\'nt exist');
        }
        else { //must be list
            if (!db.custom_embed || !db.custom_embed[0]) {
                return message.reply('You didn\'t save any embeds');
            } else {
                const view_embed = new EmbedBuilder()
                    .setTitle('Saved Embeds')
                    .setDescription(`${db.custom_embed.map(embed => embed.name).join('\n')}`)
                    .setColor('#797FCB')
                message.reply({ embeds: [view_embed] });
            }
        }
    }
}


