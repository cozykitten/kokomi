const { db } = require('../src/dbManager');

module.exports = async (guild) => {

    const defaultChannel = guild.systemChannel || guild.channels.cache.find(channel => channel.type === 0 && channel.permissionsFor(guild.members.me).has('SEND_MESSAGES'));
    await defaultChannel.send({
        content: db.serverConfig.joinMessage, embeds: [
            {
                "title": "Kokofish has joined the server!",
                "description": "\"Respect must be given to the will of every creature. Each fish in the ocean swims in its own direction.\"\n\nso be sure to pet the kokofish",
                "color": 9472718,
                "author": {
                    "name": "Sangonomiya Kokomi",
                    "icon_url": "https://cdn.discordapp.com/avatars/882749662099030078/56a6fbeb207fa08983464fe3a5f6f9d6.webp"
                },
                "image": {
                    "url": "https://media.tenor.com/7G4uAJZswYYAAAAC/kokomi-kokomi-genshin.gif"
                }
            }
        ]
    });
    await defaultChannel.send(db.serverConfig.joinMessage);
}