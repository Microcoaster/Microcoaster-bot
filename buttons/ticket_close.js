/**
 * Handler pour fermer un ticket
 */

const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const TicketDAO = require("../dao/ticketDAO");
const ConfigManager = require("../utils/configManager");
const ticketDAO = new TicketDAO();

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

      if (ticket.status === "closed") {
        return await interaction.editReply({
          content: "❌ This ticket is already closed.",
        });
      }

      // Créer les boutons de confirmation
      const confirmButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_confirm:${channelId}:${ticket.ticket_id}`)
          .setLabel("Yes, Close Ticket")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`ticket_close_cancel:${channelId}`)
          .setLabel("Cancel")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Secondary),
      );

      // Créer l'embed de confirmation
      const confirmEmbed = new EmbedBuilder()
        .setColor("#ff4757")
        .setTitle("🔒 Close Ticket Confirmation")
        .setDescription("Are you sure you want to close this ticket?")
        .addFields(
          { name: "Ticket ID", value: ticket.ticket_id, inline: true },
          { name: "Type", value: ticket.type || "Unknown", inline: true },
          {
            name: "Created",
            value: `<t:${Math.floor(new Date(ticket.created_at).getTime() / 1000)}:R>`,
            inline: true,
          },
          {
            name: "⚠️ Warning",
            value:
              "This action cannot be undone. The ticket will be marked as closed and **the channel will be deleted instantly**.",
            inline: false,
          },
        )
        .setFooter({ text: "Choose your action below" })
        .setTimestamp();

      await interaction.editReply({
        embeds: [confirmEmbed],
        components: [confirmButtons],
      });
    } catch (error) {
      console.error("Erreur lors de la fermeture de ticket:", error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred while preparing ticket closure.",
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while preparing ticket closure.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
