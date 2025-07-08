const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const ConfigManager = require("../utils/configManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("assign-member-role")
    .setDescription("🎭 [ADMIN] Assign the member role to all existing users")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Vérification des permissions admin
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return await interaction.editReply({
          content: "❌ You need Administrator permissions to use this command.",
        });
      }
      const configManager = ConfigManager.getInstance();
      const config = configManager.getConfig();
      const memberRoleId = config.roles.member_role_id;

      if (!memberRoleId || memberRoleId === "YOUR_MEMBER_ROLE_ID") {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Member Role Not Configured")
          .setDescription(
            "The member role is not configured. Please use `/config` to set up the member role first.",
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      const memberRole = interaction.guild.roles.cache.get(memberRoleId);
      if (!memberRole) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Member Role Not Found")
          .setDescription(
            `The member role with ID \`${memberRoleId}\` was not found on this server.`,
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Récupérer tous les membres du serveur
      await interaction.guild.members.fetch();
      const members = interaction.guild.members.cache;

      let successCount = 0;
      let alreadyHadRole = 0;
      let errorCount = 0;

      const progressEmbed = new EmbedBuilder()
        .setColor("#ffaa00")
        .setTitle("🔄 Assigning Member Role...")
        .setDescription(`Processing ${members.size} members...`)
        .setTimestamp();

      await interaction.editReply({ embeds: [progressEmbed] });

      for (const [member] of members) {
        // Ignorer les bots
        if (member.user.bot) continue;

        try {
          if (member.roles.cache.has(memberRoleId)) {
            alreadyHadRole++;
          } else {
            await member.roles.add(memberRole);
            successCount++;
          }
        } catch (error) {
          console.error(
            `Error assigning member role to ${member.user.tag}:`,
            error,
          );
          errorCount++;
        }
      }

      const resultEmbed = new EmbedBuilder()
        .setColor(errorCount > 0 ? "#ffaa00" : "#00ff00")
        .setTitle("✅ Member Role Assignment Complete")
        .setDescription(
          `The member role has been processed for all server members.`,
        )
        .addFields(
          {
            name: "📊 Results",
            value:
              `**Role Assigned:** ${successCount} members\n` +
              `**Already Had Role:** ${alreadyHadRole} members\n` +
              `**Errors:** ${errorCount} members\n` +
              `**Total Processed:** ${successCount + alreadyHadRole + errorCount} members`,
            inline: false,
          },
          {
            name: "🎭 Role Information",
            value: `**Role:** ${memberRole.name}\n**Role ID:** \`${memberRoleId}\``,
            inline: false,
          },
        )
        .setFooter({ text: "MicroCoaster™ Role Management System" })
        .setTimestamp();

      await interaction.editReply({ embeds: [resultEmbed] });

      // Logger dans le canal de logs si configuré
      const roleLogsChannelId = config.channels.role_logs_channel_id;
      if (
        roleLogsChannelId &&
        roleLogsChannelId !== "YOUR_ROLE_LOGS_CHANNEL_ID"
      ) {
        const logChannel =
          interaction.guild.channels.cache.get(roleLogsChannelId);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("🎭 Bulk Member Role Assignment")
            .setDescription(
              `Member role has been assigned to all server members.`,
            )
            .addFields(
              {
                name: "👤 Executed By",
                value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
                inline: true,
              },
              {
                name: "🎭 Role",
                value: `${memberRole.name} (\`${memberRoleId}\`)`,
                inline: true,
              },
              {
                name: "📊 Results",
                value:
                  `Assigned: ${successCount}\n` +
                  `Already had: ${alreadyHadRole}\n` +
                  `Errors: ${errorCount}`,
                inline: true,
              },
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    } catch (error) {
      console.error("Error in assign-member-role command:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ System Error")
        .setDescription(
          "A system error occurred while assigning the member role.",
        )
        .setFooter({ text: "Please contact the developer if this persists." })
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({
          embeds: [errorEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
