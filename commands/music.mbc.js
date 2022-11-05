const { db, sync } = require('../dbManager');
require('dotenv').config();
const ytdl = require('ytdl-core-discord'); //or use ytdl-core-discord if it doesnt cancel audio
const ytSearch = require('yt-search');
const ytpl = require('ytpl');
const { AudioPlayerStatus, joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');

let playerData = {};
let song_q = [];

module.exports = {
    name: 'music',
    description: "music module",
    async execute(message) {

        //permissions check
        if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return;
        }
        const args = message.content.split(/ +/, 16).slice(2, 16);


        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send('You need to be connected to a voice channel.');

        if (args[0] === 'play' || args[0] === 'load') {
            if (args[0] === 'play') {
                if (args.length < 2) return message.channel.send('No song provided.');
                var song = {};

                if (/playlist\?/.test(args[1])) {
                    console.log('playlist found')
                    if (ytpl.validateID(args[1])) {
                        console.log('..and validated')
                        const playlist = await ytpl(args[1]);
                        playlist.items.forEach((element) => {
                            song_q.push({
                                title: element.title,
                                url: element.shortUrl
                            });
                        })
                        if (playerData.Connection) {
                            song = { title: playlist.estimatedItemCount + ' items' };
                        }
                        else song = { title: playlist.items[0].title };
                    }
                }
                else {
                    if (ytdl.validateURL(args[1])) {
                        const song_info = await ytdl.getInfo(args[1]);
                        song = { title: song_info.videoDetails.title, url: song_info.videoDetails.video_url };
                        song_q.push(song);
                    }
                    else {
                        const video_finder = async (query) => {
                            const video_result = await ytSearch(query);
                            return (video_result.videos.length > 1) ? video_result.videos[0] : null;
                        }

                        const video = await video_finder(args.slice(1).join(' '));
                        if (video) {
                            song = { title: video.title, url: video.url };
                            song_q.push(song);
                        }
                        else {
                            message.channel.send('I couldn\'t find that video');
                        }
                    }
                }
            }
            else {
                if (!JSON.parse(process.env.TRUSTED).includes(message.member.id)) return message.channel.send('This option isn\'t available');
                const playlist_q = await db.playlist[await db.playlist.findIndex(list => list.name === args[1])].queue;
                playlist_q.forEach((element) => {
                    song_q.push({
                        title: element.title,
                        url: element.url
                    });
                })
                message.channel.send('Playlist loaded <:ZeroHuh:814271092801142814>');
            }

            if (!playerData.Connection) {
                

                playerData = {
                    Connection: null,
                    Player: null,
                    loop: false
                    //skip: false
                }

                try {
                    const connection = await joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: message.guild.id,
                        adapterCreator: voiceChannel.guild.voiceAdapterCreator
                    })
                    const player = await createAudioPlayer();
                    playerData.Connection = connection;
                    playerData.Player = player;
                    await video_player();
                    if (args[0] === 'play') message.channel.send(`I'm playing ${song.title} for you <:ZeroSip2:859114221916258335>`);

                    playerData.Player.on('error', error => {
                        console.error(`Error: ${error}`);
                    });

                    playerData.Player.on(AudioPlayerStatus.Idle, () => {
                        //if (playerData.skip) {
                        //playerData.skip = false;
                        if (!playerData.loop) song_q.shift();
                        video_player();
                        //}
                    });
                }
                catch (err) {
                    await message.channel.send('I couldn\'t connect to the channel');
                    throw err;
                }
            }
            else {
                if (args[0] === 'play') return message.channel.send(`I added ${song.title} to the queue <:ZeroDuck:871733658720014366>`);
            }
        }
        else if (args[0] === 'skip') skip_song(message);
        else if (args[0] === 'stop') stop_song();
        else if (args[0] === 'loop') {
            playerData.loop = !playerData.loop;
            message.channel.send(`Loop is set to \`\`${playerData.loop}\`\` now.`);
        }
        else if (args[0] === 'save' && args[1]) {
            if (!JSON.parse(process.env.TRUSTED).includes(message.member.id)) return message.channel.send('This option isn\'t available');

            if (!db.playlist || !db.playlist[0]) {
                db.playlist = [{
                    name: args[1],
                    queue: song_q
                }]
            } else {
                const index = await db.playlist.findIndex(list => list.name === args[1]);
                if (index === -1) {
                    db.playlist.push({
                        name: args[1],
                        queue: song_q
                    })
                }
                else {
                    db.playlist[index].queue = song_q;
                }
            }
            sync(db);
            message.channel.send(`You want to listen to that again?? <:ZeroWorried:812730851619635232>`);
        }
    }
}

async function video_player () {

    //console.log(song_q);
    if (!song_q[0]) {
        console.log('auto stop');
        stop_song();
        return;
    }

    const stream = await ytdl(song_q[0].url, { filter: 'audioonly', /* type: 'opus', */ highWaterMark: 1024 * 1024 * 2 });
    const resource = await createAudioResource(stream, {inputType: StreamType.Opus});

    await playerData.Player.play(resource);
    await playerData.Connection.subscribe(playerData.Player);
    //playerData.skip = true;
}

async function skip_song (message) {
    if (!message.member.voice.channel) return message.channel.send('Shouldn\'t you be in the voice channel if you want to skip the song?');
    if (!song_q[1]) return message.channel.send('I don\'t have any songs queued up right now');
    await playerData.Player.stop();
}

async function stop_song() {
    console.log('stopping');
    song_q.length = 0;
    await playerData.Player.stop();
    await playerData.Connection.destroy();
    delete playerData.Connection;
}