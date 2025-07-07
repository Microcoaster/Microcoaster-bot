/**
 * Handler pour la sélection de priorité via menu déroulant
 */

const { EmbedBuilder, MessageFlags } = require("discord.js");
const TicketDAO = require("../dao/ticketDAO");
const ticketDAO = new TicketDAO();

// Configuration des niveaux de priorité
const PRIORITY_LEVELS = {
  low: {
    label: "Low Priority",
    emoji: "🟢",
    color: "#2ecc71",
    description: "Non-urgent issue",
    prefix: "🟢-",
  },
  medium: {
    label: "Medium Priority",
    emoji: "🟡",
    color: "#f39c12",
    description: "Standard priority",
    prefix: "🟡-",
  },
  high: {
    label: "High Priority",
    emoji: "🟠",
    color: "#e67e22",
    description: "Important issue",
    prefix: "🟠-",
  },
  urgent: {
    label: "Urgent Priority",
    emoji: "🔴",
    color: "#e74c3c",
    description: "Critical issue - immediate attention required",
    prefix: "🔴-",
  },
};

module.exports = {
  execute: async (interaction, params = []) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Vérifier que des valeurs ont été sélectionnées
      if (!interaction.values || interaction.values.length === 0) {
        return await interaction.editReply({
          content: "❌ No priority selected.",
        });
      }

      const channelId = params.length > 0 ? params[0] : interaction.channel.id;
      const selectedPriority = interaction.values[0];
      const user = interaction.user;
      const guild = interaction.guild;
      const channel = guild.channels.cache.get(channelId);

      if (!channel) {
        return await interaction.editReply({
          content: "❌ Ticket channel not found.",
        });
      }

      // Vérifier que la priorité sélectionnée est valide
      const priorityConfig = PRIORITY_LEVELS[selectedPriority];
      if (!priorityConfig) {
        return await interaction.editReply({
          content: `❌ Invalid priority level: ${selectedPriority}`,
        });
      }

      // Vérifier les permissions staff
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
          content: "❌ You don't have permission to change ticket priority.",
        });
      }

      // Récupérer le ticket de la base de données
      const ticket = await ticketDAO.getTicketByChannelId(channelId);

      if (!ticket) {
        return await interaction.editReply({
          content: "❌ Ticket not found in database.",
        });
      }

      // Vérifier si la priorité est déjà la même
      if (ticket.priority === selectedPriority) {
        return await interaction.editReply({
          content: `ℹ️ Ticket priority is already set to **${priorityConfig.label}**.`,
        });
      }

      // Mettre à jour la priorité dans la base de données
      const success = await ticketDAO.updateTicketPriority(
        ticket.ticket_id,
        selectedPriority,
      );

      if (success) {
        // Modifier le nom du canal selon la priorité avec gestion d'erreur
        try {
          let newChannelName = channel.name;

          // Supprimer les anciens préfixes de priorité (avec fallback pour noms courts)
          newChannelName = newChannelName.replace(/^(🟢-|🟡-|🟠-|🔴-)/, "");

          // Ajouter le nouveau préfixe si nécessaire
          if (priorityConfig.prefix) {
            newChannelName = `${priorityConfig.prefix}${newChannelName}`;
          }

          // Limiter la longueur du nom (Discord limite à 100 caractères)
          if (newChannelName.length > 100) {
            newChannelName = newChannelName.substring(0, 97) + "...";
          }

          await channel.setName(newChannelName);
        } catch (nameError) {
          console.error(
            "Erreur lors du changement de nom de canal:",
            nameError,
          );
          // Continuer même si le changement de nom échoue
        }

        // Créer un embed de notification
        const priorityEmbed = new EmbedBuilder()
          .setColor(priorityConfig.color)
          .setTitle(`${priorityConfig.emoji} Ticket Priority Updated`)
          .setDescription(
            `This ticket priority has been set to **${priorityConfig.label.toUpperCase()}** by ${user}.`,
          )
          .addFields(
            { name: "Ticket ID", value: ticket.ticket_id, inline: true },
            { name: "Staff Member", value: `${user}`, inline: true },
            {
              name: "Priority Level",
              value: `${priorityConfig.emoji} **${priorityConfig.label.toUpperCase()}**`,
              inline: true,
            },
            {
              name: "Description",
              value: priorityConfig.description,
              inline: false,
            },
          )
          .setThumbnail(
            "https://ptero.yamakajump-crew.fr/extensions/resourcemanager/uploads/1751636055_logo.png",
          )
          .setTimestamp();

        // Envoyer la notification dans le canal du ticket
        await channel.send({ embeds: [priorityEmbed] });

        // Confirmer à l'utilisateur
        await interaction.editReply({
          content: `✅ Ticket priority successfully set to **${priorityConfig.label}**!`,
        });

        console.log(
          `\x1b[38;5;3m${priorityConfig.emoji} Ticket ${ticket.ticket_id} priorité mise à jour : ${selectedPriority} par ${user.username}\x1b[0m`,
        );
      } else {
        await interaction.editReply({
          content: "❌ Failed to update ticket priority. Please try again.",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de priorité:", error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred while updating ticket priority.",
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while updating ticket priority.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
