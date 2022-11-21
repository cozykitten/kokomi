const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const crypto = require('crypto');
const { cd, synccd } = require('../dbManager');
require('dotenv').config();

function encrypt(plain, globalPass) {

    const key = crypto.scryptSync(globalPass, process.env.SALT, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(plain, "utf-8", "hex");
    encrypted += cipher.final("hex");
    console.log(plain + '  ' + encrypted);
    console.log(iv.toString('hex'))
    return { data: encrypted, iv: iv.toString('hex') };
}

function decrypt(secret, globalPass) {
    console.log(secret)
    const key = crypto.scryptSync(globalPass, process.env.SALT, 32);
    //const iv = crypto.randomFillSync(new Uint8Array(16));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(secret.iv, 'hex'));

    let decrypted = decipher.update(secret.data, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    console.log(secret.data + ' ' + decrypted);
    return decrypted;
}

module.exports = {
    data: new SlashCommandBuilder()
		.setName('login')
		.setDescription('save and check your logins')
        .addSubcommand(subcommand => subcommand.setName('add').setDescription('add a new login')
            .addStringOption(option => option.setName('globalpassword').setDescription('your password your logins are encrypted with').setRequired(true))
            .addStringOption(option => option.setName('service').setDescription('name of the service this login is for').setRequired(true))
            .addStringOption(option => option.setName('username').setDescription('username of this login'))
            .addStringOption(option => option.setName('email').setDescription('email of this login'))
            .addStringOption(option => option.setName('servicepassword').setDescription('password of this login'))
            .addStringOption(option => option.setName('tag').setDescription('optional tag or display name')))
        .addSubcommand(subcommand => subcommand.setName('view').setDescription('display one of your saved logins')
            .addStringOption(option => option.setName('globalpassword').setDescription('your password your logins are encrypted with').setRequired(true))
            .addStringOption(option => option.setName('service').setDescription('name of the service this login is for').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!JSON.parse(process.env.TRUSTED).includes(interaction.member.id)) return interaction.reply("Don't bother me");

        if (interaction.options.getSubcommand() === 'add') {

            const globalPass = interaction.options.getString('globalpassword');
            const service = interaction.options.getString('service');
            const user = interaction.options.getString('username');
            const email = interaction.options.getString('email');
            const pass = interaction.options.getString('servicepassword');
            const tag = interaction.options.getString('tag');

            const hash = crypto.createHash('sha256').update(interaction.options.getString('globalpassword') + process.env.SALT).digest('hex');
            await interaction.reply({content: 'hashed', ephemeral: true});
            console.log(hash);

            if (cd[interaction.member.id]) {
                if (cd[interaction.member.id].hash === hash) {
                    console.log('hash identical');
                    //addLogin(interaction.member.id, service);

                    if (cd[interaction.member.id][service]) return interaction.editReply({ content: `You already saved a login for ${service}`});
                    cd[interaction.member.id][service] = {};

                    if (user) cd[interaction.member.id][service].user = encrypt(user, globalPass);
                    if (email) cd[interaction.member.id][service].email = encrypt(email, globalPass);
                    if (pass) cd[interaction.member.id][service].pass = encrypt(pass, globalPass);
                    if (tag) cd[interaction.member.id][service].tag = encrypt(tag, globalPass);

                    synccd(cd);
                    console.log(cd);
                }
            }
            else {
                cd[interaction.member.id] = { hash: hash };
                //encrypt();
                synccd(cd);
            }
            

            

            //if (!users) return interaction.reply(`Topic "${interaction.options.getString('topic')}" doesn't exists.`);
        }
        else if (interaction.options.getSubcommand() === 'view') {

            const globalPass = interaction.options.getString('globalpassword');
            const service = interaction.options.getString('service');

            const hash = crypto.createHash('sha256').update(globalPass + process.env.SALT).digest('hex');
            await interaction.reply({content: 'hashed', ephemeral: true});
            console.log(hash);

            
            interaction.editReply({ content: 'decrypted: ' + decrypt(cd[interaction.member.id][service].user, globalPass)});
        }








    }
}