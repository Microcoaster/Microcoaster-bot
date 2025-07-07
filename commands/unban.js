const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const ModerationDAO = require("../dao/moderationDAO");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("🔓 [MOD] Unban a user from the server")
    .addStringOption((option) =>
      option
        .setName("user_id")
        .setDescription("User ID to unban")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the unban")
        .setRequired(false)
        .setMaxLength(255),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    try {
      const userId = interaction.options.getString("user_id");
      const reason =
        interaction.options.getString("reason") || "No reason provided";
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
          .setDescription("You do not have permission to use this command.")
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Vérifier que l'ID utilisateur est valide
      if (!/^\d{17,19}$/.test(userId)) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Invalid User ID")
          .setDescription(
            "Please provide a valid Discord user ID (17-19 digits).",
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      try {
        // Vérifier si l'utilisateur est banni
        const bans = await interaction.guild.bans.fetch();
        const bannedUser = bans.get(userId);

        if (!bannedUser) {
          const errorEmbed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("❌ User Not Banned")
            .setDescription(
              "This user is not currently banned from the server.",
            )
            .setTimestamp();

          return await interaction.editReply({ embeds: [errorEmbed] });
        }

        // Débannir l'utilisateur
        await interaction.guild.members.unban(userId, reason); // Supprimer de la table des bans
        const moderationDAO = new ModerationDAO();
        await moderationDAO.removeBan(userId);

        // Enregistrer l'action
        await moderationDAO.addSanction(userId, "UNBAN", reason, moderator.id);

        // Obtenir les informations de l'utilisateur
        let targetUser;
        try {
          targetUser = await interaction.client.users.fetch(userId);
        } catch {
          targetUser = { id: userId, tag: `Unknown User (${userId})` };
        }

        // Embed de confirmation
        const successEmbed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("🔓 User Unbanned")
          .setDescription(
            `Successfully unbanned ${targetUser.tag || `User ID: ${userId}`}`,
          )
          .addFields(
            { name: "👤 User", value: `<@${userId}>`, inline: true },
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
              .setColor("#00ff00")
              .setTitle("🔓 User Unbanned")
              .setDescription(
                `${targetUser.tag || `User ID: ${userId}`} has been unbanned`,
              )
              .addFields(
                {
                  name: "👤 User",
                  value: `<@${userId}> (${userId})`,
                  inline: true,
                },
                {
                  name: "👮 Moderator",
                  value: `<@${moderator.id}>`,
                  inline: true,
                },
                { name: "📝 Reason", value: reason, inline: false },
              )
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        }

        // Envoyer un DM à l'utilisateur s'il est récupérable
        if (targetUser && targetUser.tag !== `Unknown User (${userId})`) {
          try {
            const dmEmbed = new EmbedBuilder()
              .setColor("#00ff00")
              .setTitle("🔓 You have been unbanned")
              .setDescription(
                `You have been unbanned from **${interaction.guild.name}**`,
              )
              .addFields({ name: "📝 Reason", value: reason, inline: false })
              .setFooter({ text: "You can now rejoin the server if you wish." })
              .setTimestamp();

            await targetUser.send({ embeds: [dmEmbed] });
          } catch (error) {
            console.log("Could not send DM to user:", error.message);
          }
        }
      } catch (error) {
        console.error("Error unbanning user:", error);

        let errorMessage =
          "Failed to unban the user. Please check my permissions.";
        if (error.code === 10013) {
          errorMessage = "This user is not currently banned from the server.";
        } else if (error.code === 50035) {
          errorMessage = "Invalid user ID provided.";
        }

        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Unban Failed")
          .setDescription(errorMessage)
          .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
      }
    } catch (error) {
      console.error("Error in unban command:", error);

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
