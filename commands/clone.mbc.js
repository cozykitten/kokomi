module.exports = {
    name: 'clone',
    Description: 'clones a channel',
    async execute(message) {

        if (!message.member.permissions.has('MANAGE_CHANNELS')) {
            return;
        }
        const args = message.content.split(/ +/, 5).slice(2, 5);

        let cloned;
        if (args[0]) {
            const channel_A = await message.guild.channels.cache.get(args[0].match(/(\d+)/)[1]);
            if (!channel_A) return message.channel.send('channel doesn\'t exist');
            cloned = await channel_A.clone();
        }
        else {
            cloned = await message.channel.clone();
        }

        if (cloned) message.channel.send('channel cloned');
        else message.channel.send('I might not have the permissions to manage channels');
    }
}