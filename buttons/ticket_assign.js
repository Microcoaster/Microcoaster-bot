/**
 * Handler pour assigner un ticket à un membre du staff
 */

const {
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require("discord.js");
const TicketDAO = require("../dao/ticketDAO");
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
      const config = require("../config/config.json");
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

      // Récupérer tous les membres du staff disponibles
      const staffMembers = [];

      for (const roleId of staffRoles) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          role.members.forEach((member) => {
            if (!staffMembers.find((sm) => sm.id === member.id)) {
              staffMembers.push({
                id: member.id,
                displayName: member.displayName,
                username: member.user.username,
              });
            }
          });
        }
      }

      if (staffMembers.length === 0) {
        return await interaction.editReply({
          content: "❌ No staff members found to assign the ticket to.",
        });
      }

      // Créer le menu de sélection des membres du staff
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`ticket_assign_select:${channelId}:${ticket.ticket_id}`)
        .setPlaceholder("Select a staff member to assign this ticket to...")
        .addOptions(
          staffMembers.slice(0, 25).map((member) => ({
            label: member.displayName,
            description: `@${member.username}`,
            value: member.id,
          })),
        );

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const assignEmbed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("👤 Assign Ticket")
        .setDescription("Select a staff member to assign this ticket to:")
        .addFields(
          { name: "Ticket ID", value: ticket.ticket_id, inline: true },
          {
            name: "Current Status",
            value: ticket.status || "Open",
            inline: true,
          },
          {
            name: "Currently Assigned",
            value: ticket.assigned_to
              ? `<@${ticket.assigned_to}>`
              : "Unassigned",
            inline: true,
          },
        )
        .setFooter({
          text: "The selected member will be notified and added to this ticket.",
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [assignEmbed],
        components: [selectRow],
      });
    } catch (error) {
      console.error("Erreur lors de l'assignation de ticket:", error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred while preparing ticket assignment.",
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while preparing ticket assignment.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
