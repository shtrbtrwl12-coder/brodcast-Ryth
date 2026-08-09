const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const OWNERS_FILE = './owners.json';
let extraOwners = [];
if (fs.existsSync(OWNERS_FILE)) {
    try {
        extraOwners = JSON.parse(fs.readFileSync(OWNERS_FILE, 'utf8'));
    } catch (e) {
        extraOwners = [];
    }
}

function saveOwners() {
    fs.writeFileSync(OWNERS_FILE, JSON.stringify(extraOwners));
}

const TARGET_ROLE_ID = '1535375782736560128';

function hasPermission(member) {
    if (member.id === member.guild.ownerId) return true;
    if (member.roles.cache.has(TARGET_ROLE_ID)) return true;
    if (extraOwners.includes(member.id)) return true;
    return false;
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const args = message.content.split(' ');
    const command = args[0];

    // أمر إضافة أونر جديد
    if (command === 'addowner') {
        if (!hasPermission(message.member)) return message.react('❌');
        
        let targetUser = message.mentions.users.first();
        if (!targetUser && args[1]) {
            try { targetUser = await client.users.fetch(args[1]); } catch (e) {}
        }
        if (!targetUser && message.reference) {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            targetUser = repliedMsg.author;
        }

        if (!targetUser) return message.reply('يرجى منشن الشخص أو إيدي الشخص المراد إضافته.');
        if (extraOwners.includes(targetUser.id)) return message.reply('هذا الشخص مضاف مسبقاً.');

        extraOwners.push(targetUser.id);
        saveOwners();
        return message.react('✅');
    }

    // أمر إزالة أونر
    if (command === 'removeowner') {
        if (!hasPermission(message.member)) return message.react('❌');

        let targetUser = message.mentions.users.first();
        if (!targetUser && args[1]) {
            try { targetUser = await client.users.fetch(args[1]); } catch (e) {}
        }
        if (!targetUser && message.reference) {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            targetUser = repliedMsg.author;
        }

        if (!targetUser) return message.reply('يرجى منشن الشخص أو إيدي الشخص المراد إزالته.');
        if (!extraOwners.includes(targetUser.id)) return message.reply('هذا الشخص ليس في قائمة الأونرز الإضافيين.');

        extraOwners = extraOwners.filter(id => id !== targetUser.id);
        saveOwners();
        return message.react('✅');
    }

    // أمر البث bc
    if (command === 'bc') {
        if (!hasPermission(message.member)) {
            return message.react('❌');
        }

        const textToSend = message.content.slice(3).trim();
        if (!textToSend) return message.react('❌');

        // تحديث أسماء الأزرار لتكون واضحة (أوفلاين، أونلاين، الكل)
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bc_offline_${Buffer.from(textToSend).toString('base64')}`).setLabel('أوفلاين').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`bc_online_${Buffer.from(textToSend).toString('base64')}`).setLabel('أونلاين').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`bc_all_${Buffer.from(textToSend).toString('base64')}`).setLabel('الكل').setStyle(ButtonStyle.Secondary)
        );

        await message.reply({ components: [row] });
        await message.delete();
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId.startsWith('bc_')) {
        await interaction.deferReply({ ephemeral: true });
        
        const type = interaction.customId.split('_')[1];
        const text = Buffer.from(interaction.customId.split('_')[2], 'base64').toString('utf-8');

        await interaction.guild.members.fetch();
        let members = interaction.guild.members.cache.filter(m => !m.user.bot);
        
        // التوزيع الصحيح حسب الزر المضغوط
        if (type === 'offline') members = members.filter(m => !m.presence || m.presence.status === 'offline');
        else if (type === 'online') members = members.filter(m => m.presence && m.presence.status !== 'offline');
        // زر 'all' سيشمل الجميع بدون فلترة

        let count = 0;
        for (const [id, member] of members) {
            try { await member.send(text); count++; } catch (e) {}
        }
        await interaction.editReply(`تم الإرسال لـ ${count} عضو.`);
    }
});

client.login(process.env.TOKEN);
