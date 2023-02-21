const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

function createEmbed(message) {
    const embed = new EmbedBuilder()
        .setTitle(message.options.getString('title'))
        .addFields(
            {
                name: 'Description',
                value: message.options.getString('description') ? message.options.getString('description').replace(/\s?\\n\s?/g, "\n") : 'missing',
            },
            {
                name: 'Source',
                value: message.options.getString('source') ? message.options.getString('source').replace(/\s?\\n\s?/g, "\n") : 'missing',
                inline: true
            },
            {
                name: 'submitted by',
                value: `${message.member}`,
                inline: true
            })
        .setColor('#b6c6e2')
        .setFooter(
            {
                text: message.options.getString('tags') ? `tags: ${message.options.getString('tags')}` : 'tags: '
            })
        .setImage(message.options.getString('image'));
    return embed;
}

function embed_index(f_message) {
    var embed = new EmbedBuilder()
        .setTitle(`new entry in #${f_message.channel.name}`)
        .setDescription(`${f_message.embeds[0].data.title}\n${f_message.embeds[0].data.footer.text}`)
        .setColor('#b6c6e2')
        .setURL(`https://discord.com/channels/${f_message.guild.id}/${f_message.channel.id}/${f_message.id}`);
    return embed;
}

function editEmbed(message, g_message) {
    const embed = new EmbedBuilder(g_message.embeds[0].data);

    if (message.options.getString('title')) embed.setTitle(message.options.getString('title'));
    if (message.options.getString('description')) embed.data.fields[0] = {
        name: 'Description',
        value: message.options.getString('description').replace(/\s?\\n\s?/g, "\n")
    };
    if (message.options.getString('source')) embed.data.fields[1] = {
        name: 'Source',
        value: message.options.getString('source').replace(/\s?\\n\s?/g, "\n"),
        inline: true
    };
    if (message.options.getString('tags')) embed.setFooter(
        {
            text: `tags: ${message.options.getString('tags')}`
        });
    if (message.options.getString('image')) embed.setImage(message.options.getString('image'));
    return embed;
}

function markEmbed(del, g_message, msg) {
    const embed = new EmbedBuilder(g_message.embeds[0].data);
    if (del) {
        embed.setTitle(`${embed.data.title} (deleted)`);
        embed.setColor('#cf7c7c');
    }
    else {
        embed.setTitle(`${embed.data.title} (outdated)`);
        embed.setColor('#e4cf99');
        embed.setDescription(`[updated entry](https://discord.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id})`);
    }
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
		.setName('entry')
		.setDescription('adds modifies or deletes submitted entries')
        .addSubcommand(subcommand => subcommand.setName('add').setDescription('add a new entry')
            .addChannelOption(option => option.setName('channel').setDescription('target channel').setRequired(true))
            .addStringOption(option => option.setName('title').setDescription('title').setRequired(true))
            .addStringOption(option => option.setName('description').setDescription('description').setMaxLength(2000))
            .addStringOption(option => option.setName('source').setDescription('source url'))
            .addStringOption(option => option.setName('tags').setDescription('tags'))
            .addStringOption(option => option.setName('image').setDescription('image url'))
            .addStringOption(option => option.setName('file').setDescription('file url')))
        .addSubcommand(subcommand => subcommand.setName('edit').setDescription('edit entry')
            .addChannelOption(option => option.setName('channel').setDescription('source channel').setRequired(true))
            .addStringOption(option => option.setName('message').setDescription('message id').setRequired(true))
            .addStringOption(option => option.setName('title').setDescription('title'))
            .addStringOption(option => option.setName('description').setDescription('description').setMaxLength(2000))
            .addStringOption(option => option.setName('source').setDescription('source url'))
            .addStringOption(option => option.setName('tags').setDescription('tags'))
            .addStringOption(option => option.setName('image').setDescription('image url'))
            .addStringOption(option => option.setName('file').setDescription('file url')))
        .addSubcommand(subcommand => subcommand.setName('delete').setDescription('delete entry')
            .addChannelOption(option => option.setName('channel').setDescription('source channel').setRequired(true))
            .addStringOption(option => option.setName('message').setDescription('message id').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false),
    async execute(message) {

        if (message.options.getSubcommand() === 'add') {

            const a_embed = createEmbed(message);
            let f_message;
            if (message.options.getString('file')) {
                f_message = await message.options.getChannel('channel').send({ embeds: [a_embed], files: [message.options.getString('file')] });
            }
            else {
                f_message = await message.options.getChannel('channel').send({ embeds: [a_embed] });
            }

            if (message.guild.id === '939260217491869726') {
                await message.guild.channels.cache.get('940722992265183332').send({ embeds: [embed_index(f_message)] });
            }
            message.reply({ content: 'new entry added', ephemeral: true });
        }
        else if (message.options.getSubcommand() === 'edit') {

            const g_message = await message.options.getChannel('channel').messages.fetch(message.options.getString('message'));
            if (message.options.getString('file')) {
                g_message.edit({ embeds: [editEmbed(message, g_message)], files: [message.options.getString('file')] });
            }
            else {
                g_message.edit({ embeds: [editEmbed(message, g_message)] });
            }
            message.reply({ content: 'entry updated', ephemeral: true });
        }
        else if (message.options.getSubcommand() === 'delete') {

            const g_message = await message.options.getChannel('channel').messages.fetch(message.options.getString('message'));
            g_message.edit({ embeds: [markEmbed(true, g_message)] });
            message.reply({ content: 'entry marked as deleted', ephemeral: true });
        }
        else message.reply('Command error');
    }
}