/**
 * Handler pour gérer la priorité des tickets avec menu de sélection
 */

const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const TicketDAO = require("../dao/ticketDAO");
const ConfigManager = require("../utils/configManager");
const ticketDAO = new TicketDAO();

// Configuration des niveaux de priorité
const PRIORITY_LEVELS = {
  low: {
    label: "Low Priority",
    emoji: "🟢",
    color: "#2ecc71",
    description: "Non-urgent issue",
  },
  medium: {
    label: "Medium Priority",
    emoji: "🟡",
    color: "#f39c12",
    description: "Standard priority",
  },
  high: {
    label: "High Priority",
    emoji: "🟠",
    color: "#e67e22",
    description: "Important issue",
  },
  urgent: {
    label: "Urgent Priority",
    emoji: "🔴",
    color: "#e74c3c",
    description: "Critical issue - immediate attention required",
  },
};

module.exports = {
  execute: async (interaction, params = []) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Extraire l'ID du canal du ticket depuis les paramètres
      const channelId = params.length > 0 ? params[0] : interaction.channel.id;
      const user = interaction.user;
      const guild = interaction.guild;
      const channel = guild.channels.cache.get(channelId);

      if (!channel) {
        return await interaction.editReply({
          content: "❌ Ticket channel not found.",
        });
      }

      // Vérifier si l'utilisateur a les permissions staff
      const configManager = ConfigManager.getInstance();
      const config = configManager.getConfig();
      const staffRoles = [
        config.roles.support_team_role_id,
        config.roles.technical_team_role_id,
        config.roles.business_team_role_id,
        config.roles.recruitment_team_role_id,
      ].filter(Boolean);

      const member = await guild.members.fetch(user.id);
      const hasStaffRole = member.roles.cache.some(
        (role) =>
          staffRoles.includes(role.id) ||
          member.permissions.has("Administrator"),
      );

      if (!hasStaffRole) {
        return await interaction.editReply({
          content: "❌ You don't have permission to manage tickets.",
        });
      }

      // Récupérer le ticket de la base de données
      const ticket = await ticketDAO.getTicketByChannelId(channelId);

      if (!ticket) {
        return await interaction.editReply({
          content: "❌ Ticket not found in database.",
        });
      }

      // Créer le menu de sélection de priorité
      const prioritySelect = new StringSelectMenuBuilder()
        .setCustomId(`priority_select:${channelId}`)
        .setPlaceholder("Choose priority level...")
        .addOptions(
          Object.entries(PRIORITY_LEVELS).map(([value, config]) => ({
            label: config.label,
            description: config.description,
            value: value,
            emoji: config.emoji,
          })),
        );

      const selectRow = new ActionRowBuilder().addComponents(prioritySelect);

      // Créer l'embed de sélection de priorité
      const priorityEmbed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("🔥 Set Ticket Priority")
        .setDescription(
          `Select the priority level for ticket **${ticket.ticket_id}**:`,
        )
        .addFields(
          Object.entries(PRIORITY_LEVELS).map(([, config]) => ({
            name: `${config.emoji} ${config.label}`,
            value: config.description,
            inline: true,
          })),
        )
        .setThumbnail(
          "https://ptero.yamakajump-crew.fr/extensions/resourcemanager/uploads/1751636055_logo.png",
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [priorityEmbed],
        components: [selectRow],
      });
    } catch (error) {
      console.error("Erreur lors de l'affichage du menu de priorité:", error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred while displaying priority menu.",
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while displaying priority menu.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
