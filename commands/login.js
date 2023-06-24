const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const { cd, synccd } = require('../src/dbManager');
require('dotenv').config();

function encrypt(plain, globalPass) {
    const key = crypto.scryptSync(globalPass, process.env.SALT, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(plain, "utf-8", "hex");
    encrypted += cipher.final("hex");
    return { data: encrypted, iv: iv.toString('hex') };
}

function decrypt(secret, globalPass) {
    const key = crypto.scryptSync(globalPass, process.env.SALT, 32);
    //const iv = crypto.randomFillSync(new Uint8Array(16));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(secret.iv, 'hex'));

    let decrypted = decipher.update(secret.data, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('login')
        .setDescription('save and check your logins')
        .addSubcommand(subcommand => subcommand.setName('add').setDescription('add a new login')
            .addStringOption(option => option.setName('globalpassword').setDescription('your password your logins are encrypted with').setMaxLength(256).setRequired(true))
            .addStringOption(option => option.setName('service').setDescription('name of the service this login is for').setMaxLength(64).setRequired(true))
            .addStringOption(option => option.setName('username').setDescription('username of this login').setMaxLength(64))
            .addStringOption(option => option.setName('email').setDescription('email of this login').setMaxLength(64))
            .addStringOption(option => option.setName('servicepassword').setDescription('password of this login').setMaxLength(256))
            .addStringOption(option => option.setName('tag').setDescription('optional tag or display name').setMaxLength(64)))
        .addSubcommand(subcommand => subcommand.setName('view').setDescription('display one of your saved logins')
            .addStringOption(option => option.setName('globalpassword').setDescription('your password your logins are encrypted with').setMaxLength(256).setRequired(true))
            .addStringOption(option => option.setName('service').setDescription('name of the service this login is for').setMaxLength(64).setRequired(true)))
        .addSubcommand(subcommand => subcommand.setName('list').setDescription('list your saved services')
            .addStringOption(option => option.setName('globalpassword').setDescription('your password your logins are encrypted with').setMaxLength(256).setRequired(true))),

    async execute(interaction) {
        //if (!JSON.parse(process.env.TRUSTED).includes(interaction.user.id)) return interaction.reply("Don't bother me");

        if (interaction.options.getSubcommand() === 'add') {

            const globalPass = interaction.options.getString('globalpassword');
            const service = interaction.options.getString('service');
            const user = interaction.options.getString('username');
            const email = interaction.options.getString('email');
            const pass = interaction.options.getString('servicepassword');
            const tag = interaction.options.getString('tag');

            const hash = crypto.createHash('sha256').update(interaction.options.getString('globalpassword') + process.env.SALT).digest('hex');

            if (!cd[interaction.user.id]) {
                cd[interaction.user.id] = { hash: hash };
            }
            else {
                if (cd[interaction.user.id].hash !== hash) return interaction.reply({ content: `hashes don't match`, ephemeral: true });
            }

            if (cd[interaction.user.id][service]) return interaction.reply({ content: `You already saved a login for ${service}`, ephemeral: true });
            cd[interaction.user.id][service] = {};


            if (user) cd[interaction.user.id][service].user = encrypt(user, globalPass);
            if (email) cd[interaction.user.id][service].email = encrypt(email, globalPass);
            if (pass) cd[interaction.user.id][service].pass = encrypt(pass, globalPass);
            if (tag) cd[interaction.user.id][service].tag = encrypt(tag, globalPass);

            synccd(cd);
            return interaction.reply({ content: `I saved your login for ${service}`, ephemeral: true });

        }
        else if (interaction.options.getSubcommand() === 'view') {

            const globalPass = interaction.options.getString('globalpassword');
            const service = interaction.options.getString('service');

            const hash = crypto.createHash('sha256').update(globalPass + process.env.SALT).digest('hex');

            if (!cd[interaction.user.id]) return interaction.reply({ content: `You didn't save any logins yet`, ephemeral: true });
            if (cd[interaction.user.id].hash !== hash) return interaction.reply({ content: `hashes don't match`, ephemeral: true });
            if (!cd[interaction.user.id][service]) return interaction.reply({ content: `You didn't save a login for ${service}`, ephemeral: true });


            const plainText = [];
            for (const field in cd[interaction.user.id][service]) {
                plainText.push(field + ': ' + decrypt(cd[interaction.user.id][service][field], globalPass));
            }

            const replyEmbed = new EmbedBuilder()
                .setTitle(`Your ${service} login`)
                .setDescription(plainText.join('\n'))
                .setColor(0x797FCB)
            interaction.reply({ embeds: [replyEmbed], ephemeral: true });

        }
        else if (interaction.options.getSubcommand() === 'list') {

            const globalPass = interaction.options.getString('globalpassword');
            const hash = crypto.createHash('sha256').update(globalPass + process.env.SALT).digest('hex');

            if (!cd[interaction.user.id]) return interaction.reply({ content: `You didn't save any logins yet`, ephemeral: true });
            if (cd[interaction.user.id].hash !== hash) return interaction.reply({ content: `hashes don't match`, ephemeral: true });
            
            const plainText = [];
            let notFirst = false;
            for (const svc in cd[interaction.user.id]) {
                if (notFirst) plainText.push(svc);
                else notFirst = true;
            }

            const replyEmbed = new EmbedBuilder()
                .setTitle('Your saved services')
                .setDescription(plainText.join('\n'))
                .setColor(0x797FCB)
            interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        }
    }
}