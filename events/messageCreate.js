require('dotenv').config();

module.exports = async (client, message) => {
    const PREFIX = "kokomi";
    const authorID = JSON.parse(process.env.AUTHOR);


    if (message.channel.type === 'dm') return;
    if (!message.content.toLowerCase().startsWith(PREFIX)) {
        if (message.content.startsWith(`<@${authorID}>`)) client.mbc.get('on ping').execute(message, client);
        return;
    }

    const [Cmd_Name, ...args] = message.content.slice(PREFIX.length).trim().split(/ +/, 1);

    if (!(Cmd_Name) || Cmd_Name.toLowerCase() === 'hi') {
        client.mbc.get('hello').execute(message);

    } else if (message.content.indexOf('go sleep') !== -1) {
        client.mbc.get('exit').execute(message, client);

    } else {
        const command = client.mbc.get(Cmd_Name);
        if (command) command.execute(message, client);

    }

    
    console.log('cmd_name: ' + Cmd_Name + '\n');
}