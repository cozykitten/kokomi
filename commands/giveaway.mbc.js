const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'giveaway',
    description: "determines a winner of a giveaway",
    async execute(message) {

        //check for mod role id
        if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return;
        }
        const args = message.content.split(/ +/, 5).slice(2, 5);

        var g_channel = await message.guild.channels.cache.get(args[0]);
        console.log(g_channel);
        var g_message = await g_channel.messages.fetch(args[1]);
        console.log(g_message);

        /* await the users who reacted to g_message and store them in an array */
        const { users } = await g_message.reactions.cache.first().fetch();
        const g_users = await users.fetch();
        const g_winners = Array.from(g_users.values());
        //console.log(`userarray\n${g_winners}\n`);

        const embed = new EmbedBuilder()
            .setTitle('entries')
            .setDescription(g_winners.join(' '))
            .setColor('#b6c6e2')
        message.channel.send({ embeds: [embed] });


        const filter = m => m.author.id === message.author.id && (m.content.startsWith('add') || m.content.startsWith('done'));
        const addUser = await message.channel.awaitMessages({filter, max: 1, time: 60000});
        if (!addUser.size) return message.channel.send('command timed out');

        var addList = addUser.first().content;
        //console.log(addList);
        if (addList.startsWith('add')) {
            //addList = addList.substr(4).split(/ +/);
            //console.log(`\n${addList}`);
            g_winners.push(addList.substr(4).split(/ +/));
        }
        else if (addList.startsWith('done')) {
            message.channel.send('no user added');
        }
        else message.channel.send('no user added');


        const embed2 = new EmbedBuilder()
            .setTitle('entries (updated)')
            .setDescription(g_winners.join(' '))
            .setColor('#b6c6e2')
        message.channel.send({ embeds: [embed2] });

        /* determine one user out of that array at random */
        var randomUser = g_winners[Math.floor(Math.random() * g_winners.length)];
        console.log(`some random user\n${randomUser}\n`);
        message.channel.send(`winner: ${randomUser}\nPlease provide the ID of the channel you want me to post the winning announcement in.`);

        const filter2 = m => m.author.id === message.author.id;
        const a_channel = await message.channel.awaitMessages({filter2, max: 1, time: 30000});
        if (!a_channel.size) return message.channel.send('command timed out');

        const w_channel = await message.guild.channels.cache.get(a_channel.first().content.match(/(\d+)/)[1]);
        message.channel.send(`channel set to: ${w_channel}\nPlease specify the title of the winning message.`)
        const w_title = await message.channel.awaitMessages({filter2, max: 1, time: 30000});
        if (!w_title.size) return message.channel.send('command timed out');

        message.channel.send(`title set to: ${w_title.first().content}\nWhat do you want the description to be?`)
        const w_message = await message.channel.awaitMessages({filter2, max: 1, time: 30000});
        if (!w_message.size) return message.channel.send('command timed out');

        message.channel.send(`description set to: ${w_message.first().content}\nPlease provide a colour in hex format.`)
        const w_color = await message.channel.awaitMessages({filter2, max: 1, time: 30000});
        if (!w_color.size) return message.channel.send('command timed out');

        const w_embed = new EmbedBuilder()
            .setTitle(w_title.first().content)
            .setDescription(w_message.first().content)
            .setColor(w_color.first().content)

        w_channel.send({ embeds: [w_embed] });

    }
}