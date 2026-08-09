const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require('express');

// إعداد خادم الexpress للحفاظ على تشغيل البوت في منصات الاستضافة مثل Render
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Broadcast Bot is alive!'));
app.listen(port, () => console.log(`Server running on port ${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences, // ضروري لمعرفة حالة الأعضاء (أونلاين / أوفلاين)
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Broadcast Bot logged in as ${client.user.tag}`);
});

// أمر لإرسال لوحة التحكم والأزرار (مثلاً تكتب !broadcast والنص)
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0];

    // أمر عرض الأزرار والرسالة المراد إرسالها
    if (command === '!broadcast') {
        // تأكد أن الشخص لديه صلاحيات الإدارة أو المالك
        if (!message.member.permissions.has('Administrator')) return message.reply('هذا الأمر للأدارة فقط.');

        const textToSend = message.content.slice(10).trim();
        if (!textToSend) return message.reply('يرجى كتابة النص المراد إرساله بعد الأمر! مثال: `!broadcast السلام عليكم`');

        // تصميم الأزرار (نفس فكرة الأرقام في صورتك)
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`broadcast_offline_${Buffer.from(textToSend).toString('base64')}`)
                .setLabel('أوفلاين')
                .setStyle(ButtonStyle.Secondary), // أزرار سوداء/رمادية مثل الصورة
            new ButtonBuilder()
                .setCustomId(`broadcast_online_${Buffer.from(textToSend).toString('base64')}`)
                .setLabel('أونلاين')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`broadcast_all_${Buffer.from(textToSend).toString('base64')}`)
                .setLabel('الكل')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.reply({
            content: `**اختر الفئة المستهدفة لإرسال الرسالة التالية بالخاص:**\n\`\`\`${textToSend}\`\`\``,
            components: [row]
        });
    }
});

// التعامل مع الضغط على الأزرار
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('broadcast_')) {
        await interaction.deferReply({ ephemeral: true });

        const parts = interaction.customId.split('_');
        const type = parts[1]; // offline, online, all
        const encodedText = parts.slice(2).join('_');
        const textToSend = Buffer.from(encodedText, 'base64').toString('utf-8');

        await interaction.guild.members.fetch(); // جلب أعضاء السيرفر

        let members;
        if (type === 'offline') {
            members = interaction.guild.members.cache.filter(m => !m.user.bot && (!m.presence || m.presence.status === 'offline' || m.presence.status === 'invisible'));
        } else if (type === 'online') {
            members = interaction.guild.members.cache.filter(m => !m.user.bot && m.presence && m.presence.status !== 'offline' && m.presence.status !== 'invisible');
        } else if (type === 'all') {
            members = interaction.guild.members.cache.filter(m => !m.user.bot);
        }

        let successCount = 0;
        let failCount = 0;

        for (const [id, member] of members) {
            try {
                // إرسال النص الصافي بالخاص بدون أي إضافات أو قوالب
                await member.send(textToSend);
                successCount++;
            } catch (err) {
                failCount++;
            }
        }

        await interaction.editReply(`تمت العملية بنجاح!\n- تم الإرسال إلى: ${successCount}\n- فَشِل الإرسال (أقفل الخاص): ${failCount}`);
    }
});

client.login(process.env.TOKEN);
