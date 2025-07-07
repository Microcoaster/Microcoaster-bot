/**
 * Handler pour confirmer la fermeture d'un ticket
 */

const { EmbedBuilder } = require("discord.js");
const TicketDAO = require("../dao/ticketDAO");
const ticketDAO = new TicketDAO();

module.exports = {
  execute: async (interaction, params = []) => {
    try {
      await interaction.deferUpdate();

      // Extraire les paramètres du custom ID
      const channelId = params.length > 0 ? params[0] : interaction.channel.id;

      const user = interaction.user;
      const guild = interaction.guild;
      const channel = guild.channels.cache.get(channelId);

      if (!channel) {
        return await interaction.editReply({
          content: "❌ Ticket channel not found.",
          embeds: [],
          components: [],
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
          content: "❌ You don't have permission to close tickets.",
          embeds: [],
          components: [],
        });
      }

      // Récupérer le ticket de la base de données
      const ticket = await ticketDAO.getTicketByChannelId(channelId);

      if (!ticket) {
        return await interaction.editReply({
          content: "❌ Ticket not found in database.",
          embeds: [],
          components: [],
        });
      }
      if (ticket.status === "closed") {
        return await interaction.editReply({
          content: "❌ This ticket is already closed.",
          embeds: [],
          components: [],
        });
      }

      // Créer la transcription du ticket avant de le fermer
      console.log(
        `📝 Création de la transcription pour le ticket ${ticket.ticket_id}...`,
      );

      try {
        // Récupérer tous les messages du canal
        const messages = await channel.messages.fetch({ limit: 100 });

        // Convertir les messages en format texte lisible
        const transcription = messages
          .reverse()
          .map((msg) => {
            const timestamp = new Date(msg.createdTimestamp).toISOString();
            const author = msg.author.bot
              ? `[BOT] ${msg.author.username}`
              : msg.author.username;
            let content = msg.content || "[No text content]";

            // Ajouter les embeds s'il y en a
            if (msg.embeds.length > 0) {
              const embedsText = msg.embeds
                .map((embed) => {
                  let embedText = "";
                  if (embed.title) embedText += `**${embed.title}**\n`;
                  if (embed.description) embedText += `${embed.description}\n`;
                  if (embed.fields.length > 0) {
                    embedText += embed.fields
                      .map((field) => `**${field.name}:** ${field.value}`)
                      .join("\n");
                  }
                  return embedText;
                })
                .join("\n---\n");
              content += `\n[EMBED]\n${embedsText}\n[/EMBED]`;
            }

            // Ajouter les attachments s'il y en a
            if (msg.attachments.size > 0) {
              const attachments = Array.from(msg.attachments.values())
                .map((att) => `[ATTACHMENT: ${att.name} - ${att.url}]`)
                .join("\n");
              content += `\n${attachments}`;
            }

            return `[${timestamp}] ${author}: ${content}`;
          })
          .join("\n\n");

        // Sauvegarder la transcription dans la base de données
        const transcriptionHeader = `=== TICKET TRANSCRIPTION ===
Ticket ID: ${ticket.ticket_id}
User: ${guild.members.cache.get(ticket.user_id)?.user.username || ticket.user_id}
Type: ${ticket.type}
Status: ${ticket.status}
Created: ${ticket.created_at}
Closed: ${new Date().toISOString()}
Closed by: ${user.username} (${user.id})
Total Messages: ${messages.size}

=== MESSAGES ===

${transcription}

=== END OF TRANSCRIPTION ===`;

        await ticketDAO.createTranscription(
          ticket.ticket_id,
          transcriptionHeader,
          user.id,
        );
        console.log(
          `✅ Transcription sauvegardée pour le ticket ${ticket.ticket_id}`,
        );
      } catch (transcriptionError) {
        console.error(
          "⚠️ Erreur lors de la création de la transcription:",
          transcriptionError,
        );
        // Continuer malgré l'erreur de transcription
      }

      // Mettre à jour le statut du ticket dans la base de données
      await ticketDAO.updateTicketStatus(ticket.ticket_id, "closed", user.id); // Créer l'embed de confirmation
      const closedEmbed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("✅ Ticket Closed Successfully")
        .setDescription(
          "This ticket has been closed and will be deleted in 5 seconds.\n📝 A transcription has been saved for future reference.",
        )
        .addFields(
          { name: "Ticket ID", value: ticket.ticket_id, inline: true },
          { name: "Closed by", value: `<@${user.id}>`, inline: true },
          {
            name: "Closed at",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          },
        )
        .setFooter({ text: "Thank you for using our support system!" })
        .setTimestamp();

      // Mettre à jour le message avec la confirmation
      await interaction.editReply({
        embeds: [closedEmbed],
        components: [],
      });

      console.log(
        `\x1b[32m✅ Ticket ${ticket.ticket_id} fermé par ${user.username} (${user.id})\x1b[0m`,
      );

      // Attendre 5 secondes puis supprimer le canal
      setTimeout(async () => {
        try {
          await channel.delete();
          console.log(
            `\x1b[31m🗑️  Canal de ticket ${channel.name} supprimé\x1b[0m`,
          );
        } catch (error) {
          console.error("Erreur lors de la suppression du canal:", error);
        }
      }, 5000);
    } catch (error) {
      console.error(
        "Erreur lors de la confirmation de fermeture de ticket:",
        error,
      );

      try {
        await interaction.editReply({
          content: "❌ An error occurred while closing the ticket.",
          embeds: [],
          components: [],
        });
      } catch (editError) {
        console.error("Erreur lors de l'édition de la réponse:", editError);
      }
    }
  },
};
