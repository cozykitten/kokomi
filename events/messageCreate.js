const { EmbedBuilder } = require('discord.js');
require('dotenv').config();
const { db } = require('../src/dbManager');

//globals
const requestUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_API_KEY}`;
const urlRegex = /(https?:\/\/[^\s]+)/g;

async function sendModLog(msg, reason) {
    if (!db.serverConfig[msg.guild.id]) return;

    const channel = await msg.guild.channels.fetch(db.serverConfig[msg.guild.id].modLog);
    const modifiedContent = msg.content.replace(/https?:\/\//g, "https //");
  
    const embed = new EmbedBuilder()
    .setTitle(`Message containing flagged link removed: Type \`\`${reason}\`\``)
    .addFields(
        {
            name: 'from',
            value: `<@${msg.member.id}>`,
            inline: true
        },
        {
            name: 'in',
            value: `<#${msg.channel.id}>`,
            inline: true
        },
        {
            name: 'message content',
            value: modifiedContent.length > 1024 ? modifiedContent.slice(0, 1021) + "..." : modifiedContent,
            inline: false
        })
    .setColor(0xe4cf99);
    channel.send({ embeds: [embed] });
  }
  

module.exports = async (message) => {
    if (!message.inGuild()) return;
    const urls = message.content.match(urlRegex);
    if (!urls) return;

    const requestBody = {
        client: {
            clientId: 'url-scanning',
            clientVersion: '1.0.0'
        },
        threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION', 'THREAT_TYPE_UNSPECIFIED'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: urls.map(u => ({ url: u }))
        }
    }

    try {
        const response = await fetch(requestUrl, {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.matches) {
            if (message.deletable) message.delete();
            message.channel.send(`<@${message.member.id}> Malicious URL of type: \`\`${data.matches[0].threatType}\`\``);
            if (message.member.moderatable) message.member.timeout(600000, 'Flagged bad link');
            sendModLog(message, data.matches[0].threatType);
        }
    } catch (error) {
        console.error(`Error checking URL with Google Safe Browsing API: ` + error);
        return;
    }
}