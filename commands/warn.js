const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const ModerationDAO = require("../dao/moderationDAO");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("🚨 [MOD] Give a manual warning to a user")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to warn").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning")
        .setRequired(true)
        .setMaxLength(255),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      const moderator = interaction.user;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Vérifier les permissions
      const config = require("../config/config.json");
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
          .setDescription(
            "You don't have permission to use moderation commands.",
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Vérifier que l'utilisateur cible est sur le serveur
      let targetMember;
      try {
        targetMember = await interaction.guild.members.fetch(targetUser.id);
      } catch {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ User Not Found")
          .setDescription("The specified user is not a member of this server.")
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Vérifier que le modérateur ne peut pas warn quelqu'un avec un rôle supérieur
      if (
        targetMember.roles.highest.position >= member.roles.highest.position &&
        !member.permissions.has("Administrator")
      ) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Insufficient Permissions")
          .setDescription("You cannot warn someone with equal or higher roles.")
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }
      const moderationDAO = new ModerationDAO();

      // Ajouter l'avertissement à l'historique
      await moderationDAO.addSanction(
        targetUser.id,
        "WARN",
        reason,
        moderator.id,
      );

      // Récupérer l'historique pour compter les avertissements
      const history = await moderationDAO.getUserSanctionHistory(
        targetUser.id,
        50,
      );
      const warningCount = history.filter(
        (log) => log.action_type === "WARN",
      ).length; // Envoyer un DM à l'utilisateur averti
      try {
        const userEmbed = new EmbedBuilder()
          .setColor("#ffa500")
          .setTitle("⚠️ Warning Received - MicroCoaster™")
          .setDescription(
            "You have received a warning from the moderation team.",
          )
          .addFields(
            { name: "📋 Reason", value: reason, inline: false },
            { name: "👨‍💼 Warned By", value: moderator.tag, inline: true },
            {
              name: "📊 Total Warnings",
              value: `${warningCount}`,
              inline: true,
            },
            {
              name: "📖 Important",
              value: "Please review our server rules to avoid further actions.",
              inline: false,
            },
          )
          .setFooter({ text: "MicroCoaster™ Moderation System" })
          .setTimestamp();

        await targetUser.send({ embeds: [userEmbed] });
      } catch {
        console.log(`Impossible d'envoyer un DM à ${targetUser.tag}`);
      } // Logger dans le salon de modération
      try {
        const logChannelId = config.channels.logs_moderation_channel_id;
        if (logChannelId) {
          const logChannel =
            interaction.client.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor("#ffa500")
              .setTitle("⚠️ Manual Warning Issued")
              .addFields(
                {
                  name: "👤 User",
                  value: `${targetUser.tag} (<@${targetUser.id}>)`,
                  inline: true,
                },
                {
                  name: "👨‍💼 Moderator",
                  value: `${moderator.tag}`,
                  inline: true,
                },
                {
                  name: "📊 Total Warnings",
                  value: `${warningCount}`,
                  inline: true,
                },
                { name: "📋 Reason", value: reason, inline: false },
              )
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      } catch (logError) {
        console.error("Erreur lors du logging:", logError);
      }

      // Réponse de confirmation
      const successEmbed = new EmbedBuilder()
        .setColor("#ffa500")
        .setTitle("⚠️ Warning Issued")
        .setDescription(`Successfully warned ${targetUser.tag}`)
        .addFields(
          { name: "📋 Reason", value: reason, inline: false },
          { name: "📊 Total Warnings", value: `${warningCount}`, inline: true },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("Error in warn command:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ System Error")
        .setDescription("An error occurred while processing the warning.")
        .setFooter({
          text: "Please contact an administrator if this persists.",
        })
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
