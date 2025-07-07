/**
 * Handler pour traiter la modale des notes internes
 */

const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  execute: async (interaction) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Extraire les paramètres du customId
      const [, channelId, ticketId] = interaction.customId.split(":");

      // Récupérer les valeurs de la modale
      const internalNotes =
        interaction.fields.getTextInputValue("internal_notes");
      const noteCategory =
        interaction.fields.getTextInputValue("note_category") || "General";

      const guild = interaction.guild;
      const channel = guild.channels.cache.get(channelId);
      const user = interaction.user;

      if (!channel) {
        return await interaction.editReply({
          content: "❌ Ticket channel not found.",
        });
      }

      // Créer l'embed des notes internes
      const notesEmbed = new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("📋 Internal Notes Added")
        .setDescription("**🔒 Staff Only - Not visible to customer**")
        .addFields(
          { name: "📝 Category", value: noteCategory, inline: true },
          { name: "👤 Added by", value: `${user}`, inline: true },
          {
            name: "🕐 Timestamp",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          },
          {
            name: "📄 Notes",
            value: `\`\`\`\n${internalNotes}\n\`\`\``,
            inline: false,
          },
        )
        .setFooter({
          text: `Ticket ID: ${ticketId} • Internal Staff Communication`,
        })
        .setTimestamp();

      // Envoyer les notes dans le canal du ticket
      await channel.send({ embeds: [notesEmbed] });

      // Confirmer à l'utilisateur
      await interaction.editReply({
        content: "✅ Internal notes successfully added to the ticket!",
      });

      console.log(
        `\x1b[38;5;5m📋 Notes internes ajoutées au ticket ${ticketId} par ${user.username}\x1b[0m`,
      );
    } catch (error) {
      console.error("Erreur lors de l'ajout de notes internes:", error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred while adding internal notes.",
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while adding internal notes.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
