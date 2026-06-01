require("dotenv").config();

const {
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("ticket-kur")
        .setDescription("Ticket panelini kurar.")
        .addChannelOption(option =>
            option
                .setName("kanal")
                .setDescription("Panelin gönderileceği kanal")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("Komutlar yüklendi.");
    } catch (err) {
        console.error(err);
    }
})();