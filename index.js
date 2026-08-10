const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// أيدي الرول المسموح له استخدام البرودكاست
const ALLOWED_ROLE_ID = "1535375782736560128";

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // التحقق من الأمر bc
    if (message.content.startsWith('bc')) {
        // التحقق من الرول
        if (!message.member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return message.react('❌').catch(() => {});
        }

        // استخراج النص المراد إرساله بعد كلمة bc
        const args = message.content.slice(2).trim();
        if (!args) {
            return message.react('❌').catch(() => {});
        }

        // إنشاء الأزرار الثلاثة المطلوبة
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('bc_online')
                .setLabel('اونلاين')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('bc_offline')
                .setLabel('اوفلاين')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('bc_all')
                .setLabel('الكل')
                .setStyle(ButtonStyle.Primary)
        );

        try {
            // إرسال رسالة الأزرار واختيار نوع البرودكاست
            const sentMsg = await message.reply({
                content: `**اختر فئة الأعضاء المستهدفة للبرودكاست:**\n> ${args}`,
                components: [row]
            });

collector.on('collect', async (interaction) => {
    if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'هذه الأزرار ليست لك!', ephemeral: true });
    }

    await interaction.deferUpdate();

    // جلب جميع أعضاء السيرفر للتأكد من حالتهم
    await message.guild.members.fetch();

    let membersToSend = [];

    if (interaction.customId === 'bc_online') {
        // المتصلين فقط (حالتهم غير offline)
        membersToSend = message.guild.members.cache.filter(m => !m.user.bot && m.presence && m.presence.status !== 'offline');
    } else if (interaction.customId === 'bc_offline') {
        // غير المتصلين (أوفلاين أو ليس لديهم بريزنس مسجل)
        membersToSend = message.guild.members.cache.filter(m => !m.user.bot && (!m.presence || m.presence.status === 'offline'));
    } else if (interaction.customId === 'bc_all') {
        // الكل (ما عدا البوتات)
        membersToSend = message.guild.members.cache.filter(m => !m.user.bot);
    }

    // تعديل الرسالة وإزالة الأزرار بعد الاختيار
    await sentMsg.edit({ content: 'جاري إرسال البرودكاست...', components: [] }).catch(() => {});

    // إرسال الرسالة بالخاص لكل عضو بدون أي كلام اضافي
    let successCount = 0;
    for (const [, member] of membersToSend) {
        try {
            await member.send(args);
            successCount++;
        } catch (err) {
            // تجاهل الأعضاء الذين يغلقون رسائل الخاص
        }
    }

    // وضع رياكشن صح إذا تمت العملية بنجاح
    await message.react('✅').catch(() => {});
});

collector.on('end', async () => {
    await sentMsg.edit({ components: [] }).catch(() => {});
});

        } catch (error) {
            // إذا حدث أي خطأ يتم وضع رياكشن خطأ
            return message.react('❌').catch(() => {});
        }
    }
});

client.login(process.env.TOKEN);
