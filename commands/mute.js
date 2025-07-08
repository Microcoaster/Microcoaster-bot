const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const ModerationDAO = require("../dao/moderationDAO");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("🔇 [MOD] Mute a user for a specified duration")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to mute").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Mute duration (e.g., 10m, 1h, 1d)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the mute")
        .setRequired(true)
        .setMaxLength(255),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("user");
      const durationStr = interaction.options.getString("duration");
      const reason = interaction.options.getString("reason");
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

      // Récupérer le membre à muter
      const targetMember = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);
      if (!targetMember) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ User Not Found")
          .setDescription("This user is not in the server.")
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Vérifier si l'utilisateur peut être muté
      if (
        targetMember.permissions.has("Administrator") ||
        targetMember.roles.cache.some((role) => staffRoles.includes(role.id))
      ) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Cannot Mute Staff Member")
          .setDescription("You cannot mute administrators or staff members.")
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Parser la durée
      const duration = parseDuration(durationStr);
      if (!duration) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Invalid Duration")
          .setDescription(
            "Please use a valid duration format (e.g., 10m, 1h, 1d, 1w)",
          )
          .addFields({
            name: "Examples:",
            value:
              "• `10m` - 10 minutes\n• `1h` - 1 hour\n• `2d` - 2 days\n• `1w` - 1 week",
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Limiter la durée maximale à 28 jours (limite Discord)
      const maxDuration = 28 * 24 * 60 * 60 * 1000; // 28 jours en millisecondes
      if (duration > maxDuration) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Duration Too Long")
          .setDescription("Maximum mute duration is 28 days.")
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      try {
        // Appliquer le timeout
        await targetMember.timeout(duration, reason); // Enregistrer la sanction
        const moderationDAO = new ModerationDAO();
        await moderationDAO.addSanction(
          targetUser.id,
          "MUTE",
          reason,
          moderator.id,
          null,
          duration,
        );

        // Récupérer l'historique pour compter les mutes
        const history = await moderationDAO.getUserSanctionHistory(
          targetUser.id,
          50,
        );
        const muteCount = history.filter(
          (log) => log.action_type === "MUTE",
        ).length; // Envoyer un DM à l'utilisateur
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#ffa500")
            .setTitle("🔇 You have been muted")
            .setDescription(
              `You have been muted in **${interaction.guild.name}**`,
            )
            .addFields(
              { name: "📝 Reason", value: reason, inline: false },
              {
                name: "⏰ Duration",
                value: formatDuration(duration),
                inline: true,
              },
              {
                name: "📊 Total Mutes",
                value: muteCount.toString(),
                inline: true,
              },
            )
            .setFooter({
              text: "If you believe this is a mistake, please contact the moderation team.",
            })
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.log("Could not send DM to user:", error.message);
        } // Embed de confirmation
        const successEmbed = new EmbedBuilder()
          .setColor("#ffa500")
          .setTitle("🔇 User Muted")
          .setDescription(`Successfully muted ${targetUser.tag}`)
          .addFields(
            { name: "👤 User", value: `<@${targetUser.id}>`, inline: true },
            {
              name: "⏰ Duration",
              value: formatDuration(duration),
              inline: true,
            },
            {
              name: "📊 Total Mutes",
              value: muteCount.toString(),
              inline: true,
            },
            { name: "📝 Reason", value: reason, inline: false },
            { name: "👮 Moderator", value: `<@${moderator.id}>`, inline: true },
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

        // Log dans le canal de modération
        if (config.channels.logs_moderation_channel_id) {
          const logChannel = interaction.guild.channels.cache.get(
            config.channels.logs_moderation_channel_id,
          );
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor("#ffa500")
              .setTitle("🔇 User Muted")
              .setDescription(`${targetUser.tag} has been muted`)
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
                {
                  name: "⏰ Duration",
                  value: formatDuration(duration),
                  inline: true,
                },
                {
                  name: "📊 Total Mutes",
                  value: muteCount.toString(),
                  inline: true,
                },
                { name: "📝 Reason", value: reason, inline: false },
              )
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      } catch (error) {
        console.error("Error muting user:", error);

        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Mute Failed")
          .setDescription(
            "Failed to mute the user. Please check my permissions.",
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
      }
    } catch (error) {
      console.error("Error in mute command:", error);

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

  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}
