require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const config = require("./config");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
    console.log(`${client.user.tag} aktif!`);
});

function hasRole(member, roles) {
    return roles.some(roleId => member.roles.cache.has(roleId));
}

function cleanName(name) {
    return name
        .toLowerCase()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/[^a-z0-9-]/g, "");
}

client.on("interactionCreate", async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === "ticket-kur") {
                const kanal = interaction.options.getChannel("kanal");

                const embed = new EmbedBuilder()
                    .setTitle("🎫 Destek Sistemi")
                    .setDescription(
`Aşağıdan destek kategorisi seç.

🎮 **Oyun Destek**
Oyun içi hata, bug, yetki, oyuncu şikayeti ve oyun destek talepleri.

💬 **Discord Destek**
Discord sunucusu, rol, kanal, yetki ve moderasyon destek talepleri.

📌 **Genel Destek**
Genel soru, öneri, şikayet ve diğer destek talepleri.`
                    )
                    .setColor("Blue");

                const menu = new StringSelectMenuBuilder()
                    .setCustomId("ticket_select")
                    .setPlaceholder("Destek kategorisi seç")
                    .addOptions([
                        {
                            label: "Oyun Destek",
                            value: "Oyun Destek",
                            description: "Oyun ile ilgili destek al"
                        },
                        {
                            label: "Discord Destek",
                            value: "Discord Destek",
                            description: "Discord ile ilgili destek al"
                        },
                        {
                            label: "Genel Destek",
                            value: "Genel Destek",
                            description: "Genel destek al"
                        }
                    ]);

                const row = new ActionRowBuilder().addComponents(menu);

                await kanal.send({
                    embeds: [embed],
                    components: [row]
                });

                return interaction.reply({
                    content: "Ticket paneli gönderildi.",
                    ephemeral: true
                });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId !== "ticket_select") return;

            const categoryName = interaction.values[0];

            const existing = interaction.guild.channels.cache.find(
                c => c.topic === `ticket-owner:${interaction.user.id}`
            );

            if (existing) {
                return interaction.reply({
                    content: `Zaten açık bir ticketın var: ${existing}`,
                    ephemeral: true
                });
            }

            const channelName = cleanName(`${interaction.user.username}-${categoryName}`);

            const permissions = [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ];

            config.staffRoles.forEach(roleId => {
                permissions.push({
                    id: roleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                });
            });

            config.bypassRoles.forEach(roleId => {
    permissions.push({
        id: roleId,
        allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ManageMessages
        ]
    });
});

            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: config.ticketCategoryId || null,
                topic: `ticket-owner:${interaction.user.id}`,
                permissionOverwrites: permissions
            });

            const staffMentions = config.staffRoles.map(roleId => `<@&${roleId}>`).join(" ");

            const embed = new EmbedBuilder()
                .setTitle("🎫 Ticket Açıldı")
                .setDescription(
`Ticket sahibi: ${interaction.user}
Kategori: **${categoryName}**

Yetkililer kısa süre içinde ilgilenecektir.`
                )
                .setColor("Green");

            const buttons1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_claim")
                    .setLabel("Ticket Devral")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("ticket_add_user")
                    .setLabel("Yetkili Ekle")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("ticket_remove_user")
                    .setLabel("Yetkili Çıkar")
                    .setStyle(ButtonStyle.Secondary)
            );

            const buttons2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_close")
                    .setLabel("Ticketi Sil")
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({
                content: `${staffMentions} ${interaction.user}`,
                embeds: [embed],
                components: [buttons1, buttons2]
            });

            return interaction.reply({
                content: `Ticket oluşturuldu: ${channel}`,
                ephemeral: true
            });
        }

        if (interaction.isButton()) {
            if (interaction.customId === "ticket_claim") {
                if (!hasRole(interaction.member, config.staffRoles)) {
                    return interaction.reply({
                        content: "Bu ticketı devralamazsın.",
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle("📌 Ticket Devralındı")
                    .setDescription(`Bu ticketı ${interaction.user} devraldı.`)
                    .setColor("Yellow");

                return interaction.reply({
                    embeds: [embed]
                });
            }

            if (interaction.customId === "ticket_add_user") {
                if (!hasRole(interaction.member, config.manageRoles)) {
                    return interaction.reply({
                        content: "Yetkili ekleme yetkin yok.",
                        ephemeral: true
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId("modal_add_user")
                    .setTitle("Ticket Yetkili Ekle");

                const input = new TextInputBuilder()
                    .setCustomId("target_id")
                    .setLabel("Eklenecek kullanıcı veya rol ID")
                    .setPlaceholder("Örnek: 123456789012345678")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(input);
                modal.addComponents(row);

                return interaction.showModal(modal);
            }

            if (interaction.customId === "ticket_remove_user") {
                if (!hasRole(interaction.member, config.manageRoles)) {
                    return interaction.reply({
                        content: "Yetkili çıkarma yetkin yok.",
                        ephemeral: true
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId("modal_remove_user")
                    .setTitle("Ticket Yetkili Çıkar");

                const input = new TextInputBuilder()
                    .setCustomId("target_id")
                    .setLabel("Çıkarılacak kullanıcı veya rol ID")
                    .setPlaceholder("Örnek: 123456789012345678")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(input);
                modal.addComponents(row);

                return interaction.showModal(modal);
            }

            if (interaction.customId === "ticket_close") {
                if (!hasRole(interaction.member, config.deleteRoles)) {
                    return interaction.reply({
                        content: "Bu ticketı silemezsin.",
                        ephemeral: true
                    });
                }

                await interaction.reply({
                    content: "Ticket 5 saniye içinde silinecek."
                });

                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch {}
                }, 5000);
            }
        }

        if (interaction.isModalSubmit()) {
            const targetId = interaction.fields.getTextInputValue("target_id").trim();

            if (!/^\d{17,20}$/.test(targetId)) {
                return interaction.reply({
                    content: "Geçerli bir kullanıcı veya rol ID girmelisin.",
                    ephemeral: true
                });
            }

            if (interaction.customId === "modal_add_user") {
                await interaction.channel.permissionOverwrites.edit(targetId, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                return interaction.reply({
                    content: `<@${targetId}> veya <@&${targetId}> ticketa eklendi.`,
                    ephemeral: false
                });
            }

            if (interaction.customId === "modal_remove_user") {
                await interaction.channel.permissionOverwrites.delete(targetId).catch(async () => {
                    await interaction.channel.permissionOverwrites.edit(targetId, {
                        ViewChannel: false
                    });
                });

                return interaction.reply({
                    content: `<@${targetId}> veya <@&${targetId}> ticket erişiminden çıkarıldı.`,
                    ephemeral: false
                });
            }
        }
    } catch (err) {
        console.error(err);

        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({
                content: "Bir hata oluştu.",
                ephemeral: true
            }).catch(() => {});
        }

        return interaction.reply({
            content: "Bir hata oluştu.",
            ephemeral: true
        }).catch(() => {});
    }
});

client.login(process.env.TOKEN);