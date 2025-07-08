const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const ModerationDAO = require("../dao/moderationDAO");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("🔨 [MOD] Ban a user from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to ban").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(true)
        .setMaxLength(255),
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Ban duration (e.g., 7d, 30d, permanent)")
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("delete_messages")
        .setDescription(
          "Delete messages from the last X days (0-7, default: 1)",
        )
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      const durationStr = interaction.options.getString("duration");
      const deleteMessages =
        interaction.options.getInteger("delete_messages") || 1;
      const moderator = interaction.user;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Vérifier les permissions
      const ConfigManager = require("../utils/configManager");
      const config = ConfigManager.getInstance().getConfig();
      const staffRoles = [
        config.roles.admin_role_id,
        config.roles.support_team_role_id,
        config.roles.technical_team_role_id,
        config.roles.business_team_role_id,
        config.roles.recruitment_team_role_id,
      ].filter(Boolean);

      const member = await interaction.guild.members.fetch(moderator.id);
      const hasStaffRole = member.roles.cache.some(
        (role) =>
          staffRoles.includes(role.id) ||
          member.permissions.has("Administrator"),
      );

      if (!hasStaffRole) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Access Denied")
          .setDescription("You do not have permission to use this command.")
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Vérifier si l'utilisateur peut être banni
      const targetMember = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);
      if (targetMember) {
        if (
          targetMember.permissions.has("Administrator") ||
          targetMember.roles.cache.some((role) => staffRoles.includes(role.id))
        ) {
          const errorEmbed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("❌ Cannot Ban Staff Member")
            .setDescription("You cannot ban administrators or staff members.")
            .setTimestamp();

          return await interaction.editReply({ embeds: [errorEmbed] });
        }
      }

      // Parser la durée si fournie
      let expiresAt = null;
      let durationDisplay = "Permanent";

      if (durationStr && durationStr.toLowerCase() !== "permanent") {
        const duration = parseDuration(durationStr);
        if (!duration) {
          const errorEmbed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("❌ Invalid Duration")
            .setDescription(
              "Please use a valid duration format (e.g., 7d, 30d, permanent)",
            )
            .addFields({
              name: "Examples:",
              value:
                "• `7d` - 7 days\n• `30d` - 30 days\n• `permanent` - Permanent ban",
            })
            .setTimestamp();

          return await interaction.editReply({ embeds: [errorEmbed] });
        }

        expiresAt = new Date(Date.now() + duration);
        durationDisplay = formatDuration(duration);
      }

      try {
        // Envoyer un DM à l'utilisateur avant le ban
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("🔨 You have been banned")
            .setDescription(
              `You have been banned from **${interaction.guild.name}**`,
            )
            .addFields(
              { name: "📝 Reason", value: reason, inline: false },
              { name: "⏰ Duration", value: durationDisplay, inline: true },
            )
            .setFooter({
              text: "If you believe this is a mistake, please contact the moderation team.",
            })
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.log("Could not send DM to user:", error.message);
        }

        // Appliquer le ban
        await interaction.guild.members.ban(targetUser.id, {
          reason: reason,
          deleteMessageDays: deleteMessages,
        });

        // Enregistrer la sanction
        const moderationDAO = new ModerationDAO();
        await moderationDAO.addSanction(
          targetUser.id,
          "BAN",
          reason,
          moderator.id,
          null,
          expiresAt ? expiresAt.getTime() : null,
        );

        // Marquer comme banni
        await moderationDAO.banUser(targetUser.id, moderator.id, reason);

        // Ajouter à la table des bans si temporaire
        if (expiresAt) {
          await moderationDAO.addBan(targetUser.id, expiresAt, reason);
        }

        // Récupérer l'historique pour les statistiques
        const history = await moderationDAO.getUserSanctionHistory(
          targetUser.id,
          50,
        );
        const banCount = history.filter(
          (log) => log.action_type === "BAN",
        ).length;

        // Embed de confirmation
        const successEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("🔨 User Banned")
          .setDescription(`Successfully banned ${targetUser.tag}`)
          .addFields(
            { name: "👤 User", value: `<@${targetUser.id}>`, inline: true },
            { name: "⏰ Duration", value: durationDisplay, inline: true },
            {
              name: "🗑️ Messages Deleted",
              value: `${deleteMessages} day${deleteMessages !== 1 ? "s" : ""}`,
              inline: true,
            },
            { name: "📊 Total Bans", value: banCount.toString(), inline: true },
            { name: "📝 Reason", value: reason, inline: false },
            { name: "👮 Moderator", value: `<@${moderator.id}>`, inline: true },
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

        // Logger dans les statistiques du bot (non-bloquant)
        if (interaction.client.statsLogger) {
          setImmediate(async () => {
            try {
              await interaction.client.statsLogger.logModerationAction(
                "BAN",
                targetUser,
                moderator,
                `${reason} (Duration: ${durationDisplay})`,
              );
            } catch (statsError) {
              console.log(
                "Stats logging failed (non-critical):",
                statsError.message,
              );
            }
          });
        }

        // Log dans le canal de modération
        if (config.channels.logs_moderation_channel_id) {
          const logChannel = interaction.guild.channels.cache.get(
            config.channels.logs_moderation_channel_id,
          );
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor("#ff0000")
              .setTitle("🔨 User Banned")
              .setDescription(`${targetUser.tag} has been banned`)
              .addFields(
                {
                  name: "👤 User",
                  value: `<@${targetUser.id}> (${targetUser.id})`,
                  inline: true,
                },
                {
                  name: "👮 Moderator",
                  value: `<@${moderator.id}>`,
                  inline: true,
                },
                { name: "⏰ Duration", value: durationDisplay, inline: true },
                {
                  name: "🗑️ Messages Deleted",
                  value: `${deleteMessages} day${deleteMessages !== 1 ? "s" : ""}`,
                  inline: true,
                },
                {
                  name: "📊 Total Bans",
                  value: banCount.toString(),
                  inline: true,
                },
                { name: "📝 Reason", value: reason, inline: false },
              )
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      } catch (error) {
        console.error("Error banning user:", error);

        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Ban Failed")
          .setDescription(
            "Failed to ban the user. Please check my permissions.",
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
      }
    } catch (error) {
      console.error("Error in ban command:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Command Error")
        .setDescription("An error occurred while processing the command.")
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

function parseDuration(durationStr) {
  const regex = /^(\d+)([smhdw])$/i;
  const match = durationStr.match(regex);

  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
  };

  return value * multipliers[unit];
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks} week${weeks !== 1 ? "s" : ""}`;
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}
