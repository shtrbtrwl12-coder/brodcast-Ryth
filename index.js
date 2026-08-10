const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const ALLOWED_ROLE_ID = "1535375782736560128";

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content.startsWith('bc')) {
        if (!message.member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return message.react('❌').catch(() => {});
        }

        const args = message.content.slice(2).trim();
        if (!args) {
            return message.react('❌').catch(() => {});
        }

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
            const sentMsg = await message.reply({
                content: `**اختر فئة الأعضاء المستهدفة للبرودكاست:**\n> ${args}`,
                components: [row]
            });

            const filter = i => i.user.id === message.author.id;
            const collector = sentMsg.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (interaction) => {
                await interaction.deferUpdate();

                await message.guild.members.fetch();
                let membersToSend = [];

                if (interaction.customId === 'bc_online') {
                    membersToSend = message.guild.members.cache.filter(m => !m.user.bot && m.presence && m.presence.status !== 'offline');
                } else if (interaction.customId === 'bc_offline') {
                    membersToSend = message.guild.members.cache.filter(m => !m.user.bot && (!m.presence || m.presence.status === 'offline'));
                } else if (interaction.customId === 'bc_all') {
                    membersToSend = message.guild.members.cache.filter(m => !m.user.bot);
                }

                await sentMsg.edit({ content: 'جاري إرسال البرودكاست...', components: [] }).catch(() => {});

                for (const [, member] of membersToSend) {
                    try {
                        await member.send(args);
                    } catch (err) {}
                }

                await message.react('✅').catch(() => {});
                collector.stop();
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    await sentMsg.edit({ content: 'انتهى وقت الاختيار.', components: [] }).catch(() => {});
                    await message.react('❌').catch(() => {});
                }
            });

        } catch (error) {
            return message.react('❌').catch(() => {});
        }
    }
});

client.login(process.env.TOKEN);
