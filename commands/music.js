const { db, sync } = require('../dbManager');
require('dotenv').config();
const ytdl = require('ytdl-core-discord');
const ytSearch = require('yt-search');
const ytpl = require('ytpl');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { AudioPlayerStatus, joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');

let playerData = {};
let song_q = [];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
		.setDescription('music module')
        .addSubcommand(subcommand => subcommand.setName('play').setDescription('queue a song or playlist')
            .addStringOption(option => option.setName('song').setDescription('name or url').setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('load').setDescription('load saved playlist')
            .addStringOption(option => option.setName('playlist').setDescription('saved playlist name').setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('save').setDescription('save the current queue')
            .addStringOption(option => option.setName('name').setDescription('name to save as').setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('stop').setDescription('stop player'))
        .addSubcommand(subcommand => subcommand.setName('skip').setDescription('skip the current song')
        .addIntegerOption(option => option.setName('amount').setDescription('amount of songs to skip')))
        .addSubcommand(subcommand => subcommand.setName('loop').setDescription('toggle song looping')
            .addBooleanOption(option => option.setName('toggle').setDescription('true / false').setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('queue').setDescription('shows the queue'))
        .addSubcommand(subcommand => subcommand.setName('playlists').setDescription('lists saved playlists'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message) {

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('You need to be connected to a voice channel.');

        if (message.options.getSubcommand() === 'play' || message.options.getSubcommand() === 'load') {
            if (message.options.getSubcommand() === 'play') {
                message.deferReply({ ephemeral: true });
                var song = {};

                if (/playlist\?/.test(message.options.getString('song'))) {
                    console.log('playlist found')
                    if (ytpl.validateID(message.options.getString('song'))) {
                        console.log('..and validated')
                        const playlist = await ytpl(message.options.getString('song'));
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
                    if (ytdl.validateURL(message.options.getString('song'))) {
                        try {
                            const song_info = await ytdl.getInfo(message.options.getString('song'));
                            song = { title: song_info.videoDetails.title, url: song_info.videoDetails.video_url };
                            song_q.push(song);
                        } catch (error) {
                            //console.log(error);
                            return message.editReply('This video is either private or age restricted.');
                        }
                    }
                    else {
                        const video_finder = async (query) => {
                            const video_result = await ytSearch(query);
                            return (video_result.videos.length > 1) ? video_result.videos[0] : null;
                        }

                        const video = await video_finder(message.options.getString('song'));
                        if (video) {
                            song = { title: video.title, url: video.url };
                            song_q.push(song);
                        }
                        else {
                            message.editReply('I couldn\'t find that video');
                        }
                    }
                }
            }
            else {
                const playlist_q = await db.playlist[await db.playlist.findIndex(list => list.name === message.options.getString('playlist'))].queue;
                playlist_q.forEach((element) => {
                    song_q.push({
                        title: element.title,
                        url: element.url
                    });
                })
                message.reply({ content: 'Playlist loaded <:ZeroShrug:1038896874985365626>', ephemeral: true });
            }

            if (!playerData.Connection) {
                

                playerData = {
                    Connection: null,
                    Player: null,
                    loop: false
                    //skip: false
                }

                try {
                    const connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: message.guild.id,
                        adapterCreator: voiceChannel.guild.voiceAdapterCreator
                    })
                    const player = createAudioPlayer();
                    playerData.Connection = connection;
                    playerData.Player = player;
                    await video_player();
                    if (message.options.getSubcommand() === 'play') message.editReply(`I'm playing ${song.title} for you.`);

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
                    await message.editReply('I couldn\'t connect to the channel');
                    throw err;
                }
            }
            else {
                if (message.options.getSubcommand() === 'play') return message.editReply(`I added ${song.title} to the queue.`);
            }
        }
        else if (message.options.getSubcommand() === 'skip') skip_song(message);
        else if (message.options.getSubcommand() === 'stop') {
            stop_song();
            message.reply({ content: 'Thanks for listening! <:ZeroHappy:1038896873651572746>', ephemeral: true });
        }
        else if (message.options.getSubcommand() === 'loop') {
            playerData.loop = message.options.getBoolean('toggle');
            message.reply({ content:`Loop is set to \`\`${playerData.loop}\`\` now <:ZeroDuck:1038896870652653670>`, ephemeral: true });
        }
        else if (message.options.getSubcommand() === 'save') {
            if (!JSON.parse(process.env.TRUSTED).includes(message.member.id)) return message.reply('This option isn\'t available');

            if (!db.playlist || !db.playlist[0]) {
                db.playlist = [{
                    name: message.options.getString('name'),
                    queue: song_q
                }]
            } else {
                const index = await db.playlist.findIndex(list => list.name === message.options.getString('name'));
                if (index === -1) {
                    db.playlist.push({
                        name: message.options.getString('name'),
                        queue: song_q
                    })
                }
                else {
                    db.playlist[index].queue = song_q;
                }
            }
            sync(db);
            message.reply({ content: `You want to listen to that again?? <:ZeroWorried:1038896879288713256>`, ephemeral:false });
        }
        else if (message.options.getSubcommand() === 'queue') {
            if (!JSON.parse(process.env.TRUSTED).includes(message.member.id)) return message.reply('This option isn\'t available');
            if (!song_q[0]) return message.reply({ content: 'The queue is currently empty.', ephemeral: true });

            const view_embed = new EmbedBuilder()
                .setTitle('Queue')
                .setDescription(`${song_q.map(song => song.title).join('\n')}`)
                .setColor('#b6c6e2')
            message.reply({ embeds: [view_embed], ephemeral: true });
        }
        else if (message.options.getSubcommand() === 'playlists') {
            if (!JSON.parse(process.env.TRUSTED).includes(message.member.id)) return message.reply('This option isn\'t available');
            if (!db.playlist || !db.playlist[0]) return message.reply({ content: 'I don\'t have any saved playlists.', ephemeral: true });

            const saved_playlists = new EmbedBuilder()
                .setTitle('Saved Playlists')
                .setDescription(`${db.playlist.map(list => list.name).join('\n')}`)
                .setColor('#b6c6e2')
            message.reply({ embeds: [saved_playlists], ephemeral: true });

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

    try {
        const stream = await ytdl(song_q[0].url, { filter: 'audioonly', /* type: 'opus', */ highWaterMark: 1024 * 1024 * 4 });

        const resource = createAudioResource(stream, { inputType: StreamType.Opus });

        await playerData.Player.play(resource);
        await playerData.Connection.subscribe(playerData.Player);

    } catch (error) {
        //console.log(error);
        song_q.shift();
        video_player();
    }

    //playerData.skip = true;
}

async function skip_song (message) {
    if (!message.member.voice.channel) return message.reply('Shouldn\'t you be in the voice channel if you want to skip the song?');
    if (!song_q[1]) return message.reply('I don\'t have any songs queued up right now');
    if (message.options.getInteger('amount')) {
        if (message.options.getInteger('amount') > 1) song_q.splice(0, message.options.getInteger('amount') - 1);
    }

    await playerData.Player.stop();
    message.reply({ content: 'Alright <:ZeroSip:1038896876390449162>', ephemeral: true })
}

async function stop_song() {
    console.log('stopping');
    song_q.length = 0;
    await playerData.Player.stop();
    await playerData.Connection.destroy();
    delete playerData.Connection;
}