const { EmbedBuilder } = require("discord.js");
const { db, sync } = require('../dbManager');

function embed_create(message) {
    let embed = new EmbedBuilder()
        .setTitle(/title\s?"([^"]+)"/.test(message.content) ? message.content.match(/title\s?"([^"]+)"/)[1] : null)
        .setDescription(/description\s?"([^"]+)"/.test(message.content) ? message.content.match(/description\s?"([^"]+)"/)[1] : null)
        .setColor(/colou?r\s?"?([^\s]+)"?/.test(message.content) ? message.content.match(/colou?r\s?"?([^\s]+)"?/)[1] : null)
        .setAuthor({
            name: /author\s?"([^"]+)"/.test(message.content) ? message.content.match(/author\s?"([^"]+)"/)[1] : null,
            iconURL: /author\s?icon\s?"([^"]+)"/.test(message.content) ? message.content.match(/author\s?icon\s?"([^"]+)"/)[1] : null })
        .setFooter({
            text: /footer\s?"([^"]+)"/.test(message.content) ? message.content.match(/footer\s?"([^"]+)"/)[1] : null,
            iconURL: /footer\s?icon\s?"([^"]+)"/.test(message.content) ? message.content.match(/footer\s?icon\s?"([^"]+)"/)[1] : null })
        .setImage(/image\s?"([^"]+)"/.test(message.content) ? message.content.match(/image\s?"([^"]+)"/)[1] : null)
        .setThumbnail(/thumbnail\s?"([^"]+)"/.test(message.content) ? message.content.match(/thumbnail\s?"([^"]+)"/)[1] : null);

    //console.log(`embed control:\n${JSON.stringify(embed, null, 2)}\n\n`);
    message.channel.send({ embeds: [embed] });
    return embed;

}

async function embed_edit(message, name) {
    
    const e_index = await db.custom_embed.findIndex(embed => embed.name === name);
    if (e_index === -1) return message.channel.send("I couldn't find an embed with that name");

    if (/title\s?"([^"]+)"/.test(message.content)) {
        db.custom_embed[e_index].embed.title = message.content.match(/title\s?"([^"]+)"/)[1];
    }
    if (/description\s?"([^"]+)"/.test(message.content)) {
        db.custom_embed[e_index].embed.description = message.content.match(/description\s?"([^"]+)"/)[1];
    }
    if (/colou?r\s?"?([^\s]+)"?/.test(message.content)) {
        db.custom_embed[e_index].embed.color = parseInt(message.content.match(/description\s?"([^"]+)"/)[1], 16);
    }
    if (/image\s?"([^"]+)"/.test(message.content)) {
        db.custom_embed[e_index].embed.image.url = message.content.match(/image\s?"([^"]+)"/)[1];
    }
    sync(db);
    return db.custom_embed[e_index].embed;
}

async function embed_send(message, e_embed, e_channel, filter) {
    message.channel.send('Please specify the message content (text above the embed).\nWrite \`\`done\`\` if you don\'t want to add any.');

    const content = await message.channel.awaitMessages({filter, max: 1, time: 30000 });
    if (!content.size) return message.channel.send('command timed out');

    var e_content = content.first().content;
    
    const a_channel = await message.guild.channels.cache.get(e_channel.first().content.match(/(\d+)/)[1]);

    if (e_content === 'done') a_channel.send({ embeds: [e_embed] });
    else a_channel.send({ content: e_content, embeds: [e_embed] }); //await embed_create(message, args)

}

function embed_help(message) {
    const help_embed = new EmbedBuilder()
        .setTitle('embed usage')
        .setDescription('**embed create**: Creates a new embed. The parameters you can set are\n'
        + '{title ""} {description ""} {colour "``in_hex``"} {author ""} {author icon "``url``"} {footer ""} {footer icon "``url``"} {image "``url``"} {thumbnail "``url``"}\n\n'
        + '**embed view**: Shows a list of saved embeds. You can view and send or delete them.\n\n'
        + '**embed send <name> <channel>**: Sends a saved embed directly.\n\n'
        + '**embed update <channel> <message_id> <name>**: Updates an already sent embed with a saved one specified by name.\n\n'
        + '**embed edit <name> {parameters}**: Edits parameters of a saved embed. Available parameters are\n'
        + '{title ""} {description ""} {colour "``in_hex``"} {image "``url``"}')
        .setColor('#b6c6e2')
        .setFooter({ text: '<> = required | {} = optional' })
    message.channel.send({ embeds: [help_embed] });
}

module.exports = {
    name: 'embed',
    description: 'creates, saves and sends embeds',
    async execute(message) {
        //permissions check
        if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return;
        }
        const args = message.content.split(/ +/, 6).slice(2, 6);

        const filter = m => m.author.id === message.author.id;
        if (args[0] === 'create') {
            if (args.length > 2) {
                const e_embed = embed_create(message);
                message.channel.send('Do you want to send or save this embed?');

                const answer = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
                if (!answer.size) return message.channel.send('command timed out');
                const a_answer = answer.first().content.toLowerCase();

                if (a_answer === 'send') {
                    message.channel.send('Which channel do you want to send it to? (Channel ID)');
                } else if (a_answer === 'save') {
                    message.channel.send('What do you want to save it as?');
                } else return message.channel.send('didn\'t reply with either send or save.');

                const answer2 = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
                if (!answer2.size) return message.channel.send('command timed out');
                const e_name = answer2.first().content;

                if (a_answer === 'send') {
                    embed_send(message, e_embed, answer2, filter);

                } else if (a_answer === 'save') { 
                    const index = await db.custom_embed.findIndex(list => list.name === e_name);
                    if (index === -1) {

                        if (!db.custom_embed || !db.custom_embed[0]) {
                            db.custom_embed = [{
                                name: e_name,
                                embed: e_embed,
                            }]
                        } else {
                            db.custom_embed.push({
                                name: e_name,
                                embed: e_embed
                            })
                        }
                        sync(db);
                        console.log(db);
                        message.channel.send(`I saved your embed as '${e_name}'`);
                    }
                    else {
                        return message.channel.send(`"${e_name}" already exists.\n`);
                    }
                }
            } else embed_help(message);
        }
        else if (args[0] === 'view') {
            //display
            if (!db.custom_embed || !db.custom_embed[0]) {
                return message.channel.send('You didn\'t save any embeds');
            } else {
                const view_embed = new EmbedBuilder()
                    .setTitle('Saved Embeds')
                    .setDescription(`${db.custom_embed.map(embed => embed.name).join('\n')}`)
                    .setColor('#b6c6e2')
                message.channel.send({ embeds: [view_embed] });
            }

            message.channel.send('Which embed do you want to load?');
            const loaded = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
            if (!loaded.size) return message.channel.send('command timed out');

            const e_index = await db.custom_embed.findIndex(embed => embed.name === loaded.first().content);
            const e_embed = await db.custom_embed[e_index].embed;
            message.channel.send({ embeds: [e_embed] });
            //message.channel.send(e_index);

            message.channel.send('Do you want to send or delete this embed?');
            const choose = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
            if (!choose.size) return message.channel.send('command timed out');
            const e_choose = choose.first().content.toLowerCase();

            if (e_choose === 'send') {
                message.channel.send('Which channel do you want to send it to? (Channel ID)');
                const eChannel = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
                if (!eChannel.size) return message.channel.send('command timed out');

                embed_send(message, e_embed, eChannel, filter);

            } else if (e_choose === 'delete') {
                await db.custom_embed.splice(e_index, 1);
                sync(db);
                message.channel.send(`I deleted the embed '${loaded.first().content}'`);

            } else return message.channel.send('command timed out');

        }
        else if (args[0] === 'send') {
            if (args.length > 2) { //send name channel

                const e_index = await db.custom_embed.findIndex(embed => embed.name === args[1]);
                if (e_index === -1) return message.channel.send("I couldn't find an embed with that name");

                const e_embed = await db.custom_embed[e_index].embed;

                const a_channel = await message.guild.channels.cache.get(args[2].match(/(\d+)/)[1]);
                if (!a_channel) return message.channel.send("I couldn't find that channel");
                a_channel.send({ embeds: [e_embed] });
            }
        }
        else if (args[0] === 'update') {
            if (args.length > 3) {

                const e_index = await db.custom_embed.findIndex(embed => embed.name === args[3]);
                if (e_index === -1) return message.channel.send("I couldn't find an embed with that name");

                const e_embed = await db.custom_embed[e_index].embed;

                const g_channel = await message.guild.channels.cache.get(args[1].match(/(\d+)/)[1]);
                const g_message = await g_channel.messages.fetch(args[2]);
                g_message.edit({ embeds: [e_embed] });
            }
        }
        else if (args[0] === 'edit') {
            if (args.length > 2) {
                message.channel.send({ content: `I updated ${args[1]} to`, embeds: [await embed_edit(message, args[1])] });
            }
        }
        else {
            embed_help(message);
        }
    }
}


