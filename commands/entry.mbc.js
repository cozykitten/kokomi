const { EmbedBuilder } = require("discord.js");

function embed_create(message) {
    var embed = new EmbedBuilder()
        .setTitle(/title\s?"([^"]+)"/.test(message.content) ? message.content.match(/title\s?"([^"]+)"/)[1] : null)
        .addFields(
            {
                name: 'Description',
                value: /description\s?"([^"]+)"/.test(message.content) ? message.content.match(/description\s?"([^"]+)"/)[1] : 'missing'
            },
            {
                name: 'Source',
                value: /source\s?"([^"]+)"/.test(message.content) ? message.content.match(/source\s?"([^"]+)"/)[1] : 'missing',
                inline: true
            },
            {
                name: 'submitted by',
                value: `${message.author}`,
                inline: true
            })
        .setColor('#b6c6e2')
        .setFooter(
            {
                text: /tags\s?"([^"]+)"/.test(message.content) ? `tags: ${message.content.match(/tags\s?"([^"]+)"/)[1]}` : 'tags: ',
                iconURL: null
            });
    if (/image\s?"([^"]+)"/.test(message.content)) embed.setImage(message.content.match(/image\s?"([^"]+)"/)[1]);

    //console.log(`embed control:\n${JSON.stringify(embed, null, 2)}\n\n`);
    //message.channel.send({ embeds: [embed] });
    return embed;

}

function embed_index(f_message) {
    var embed = new EmbedBuilder()
        .setTitle(`new entry in #${f_message.channel.name}`)
        .setDescription(`${f_message.embeds[0].title}\n${f_message.embeds[0].footer.text}`)
        .setColor('#b6c6e2')
        .setURL(`https://discord.com/channels/${f_message.guild.id}/${f_message.channel.id}/${f_message.id}`);
    return embed;
}

function embed_edit(message, g_message) {
    const embed = new EmbedBuilder(g_message.embeds[0].data);
    embed.setTitle(`${embed.title} (updated)`);
    if (/title\s?"([^"]+)"/.test(message.content)) embed.setTitle(`${message.content.match(/title\s?"([^"]+)"/)[1]} (updated)`);
    embed.setDescription(`[original entry](https://discord.com/channels/${g_message.guild.id}/${g_message.channel.id}/${g_message.id})`);
    if (/description\s?"([^"]+)"/.test(message.content)) embed.data.fields[0] = {
        name: 'Description',
        value: message.content.match(/description\s?"([^"]+)"/)[1]
    };
    if (/source\s?"([^"]+)"/.test(message.content)) embed.data.fields[1] = {
        name: 'Source',
        value: message.content.match(/source\s?"([^"]+)"/)[1],
        inline: true
    };
    if (/tags\s?"([^"]+)"/.test(message.content)) embed.setFooter(
        {
            text: `tags: ${message.content.match(/tags\s?"([^"]+)"/)[1]}`

        });
    if (/image\s?"([^"]+)"/.test(message.content)) embed.setImage(message.content.match(/image\s?"([^"]+)"/)[1]);
    return embed;
}

function embed_mark(g_message, msg, del) {
    const embed = new EmbedBuilder(g_message.embeds[0].data);
    if (del) {
        embed.setTitle(`${embed.title} (deleted)`);
        embed.setColor('#cf7c7c');
    }
    else {
        embed.setTitle(`${embed.title} (outdated)`);
        embed.setColor('#e4cf99');
        embed.setDescription(`[updated entry](https://discord.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id})`);
    }
    return embed;
}

function embed_help() {
    const help_embed = new EmbedBuilder()
        .setTitle('entry usage')
        .setDescription('**entry add**: Adds a new entry. The parameters you can set are\n'
        + '<title "text"> <description "text"> <source "``url``"> <tags "tags separated by whitespace"> {image "``url``"} {file "``url``"}\n\n'
        + '**entry edit <channel_id> <message_id> {parameters}**: Updates parameters of an already sent entry.\n'
        + 'Available parameters are {title "edited title"} {description "edited description"} {source "``new url``"} {tags "edited tags separated by space"} {image "``new url``"} {file "``new url``"}\n\n'
        + '**entry delete <channel_id> <message_id>**: Marks an already sent entry as deleted.')
        .setColor('#b6c6e2')
        .setFooter({ text: '<> = required | {} = optional' })
    return help_embed;
}

module.exports = {
   name: 'entry',
   description: 'adds modifies or deletes submitted entries',
    async execute(message) {

        //permissions check
        if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return;
        }
        const args = message.content.split(/ +/, 5).slice(2, 5);

        if (args[0] === 'add') {
            const a_embed = embed_create(message);
            const a_msg = await message.channel.send('Please provide the channel id of the channel to post it to.');

            const filter = m => m.author.id === message.author.id;
            const a_channel = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
            if (!a_channel.size) return message.channel.send('command timed out');

            const channel_A = await message.guild.channels.cache.get(a_channel.first().content.match(/(\d+)/)[1]);
            if (!channel_A) return message.channel.send('channel doesn\'t exist');

            let f_message;
            if (/file\s?"([^"]+)"/.test(message.content)) {
                f_message = await channel_A.send({ embeds: [a_embed], files: [message.content.match(/file\s?"([^"]+)"/)[1]] });
            }
            else {
                f_message = await channel_A.send({ embeds: [a_embed] });
            }

            if (message.guild.id === '939260217491869726') {
                await message.guild.channels.cache.get('940722992265183332').send({ embeds: [embed_index(f_message)] });
            }

            message.delete();
            a_channel.first().delete();
            a_msg.delete();
        }
        else if (args[0] === 'edit') {
            const g_channel = await message.guild.channels.cache.get(args[1].match(/(\d+)/)[1]);
            const g_message = await g_channel.messages.fetch(args[2]);

            if (/file\s?"([^"]+)"/.test(message.content)) {
                const new_message = await g_channel.send({ embeds: [embed_edit(message, g_message)], files: [message.content.match(/file\s?"([^"]+)"/)[1]] });
                g_message.edit({ embeds: [embed_mark(g_message, new_message, false)] });
            }
            else {
                const new_message = await g_channel.send({ embeds: [embed_edit(message, g_message)] });
                g_message.edit({ embeds: [embed_mark(g_message, new_message, false)] });
            }
            message.delete();
        }
        else if (args[0] === 'delete') {
            const g_channel = await message.guild.channels.cache.get(args[1].match(/(\d+)/)[1]);
            const g_message = await g_channel.messages.fetch(args[2]);

            g_message.edit({ embeds: [embed_mark(g_message, g_message, true)] });
            message.delete();
        }
        else {
            message.channel.send({ embeds: [embed_help()] });
        }
    }
}