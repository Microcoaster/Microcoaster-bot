const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  execute: async (interaction) => {
    try {
      // Créer le modal pour la saisie du code de garantie
      const modal = new ModalBuilder()
        .setCustomId("warranty_activation_modal")
        .setTitle("🎫 Activate Your Premium Code");

      // Champ pour le code de garantie
      const codeInput = new TextInputBuilder()
        .setCustomId("warranty_code")
        .setLabel("Enter your premium/warranty code")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("565486512094")
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(50);

      // Ajouter le champ dans une ActionRow
      const actionRow = new ActionRowBuilder().addComponents(codeInput);

      // Ajouter l'ActionRow au modal
      modal.addComponents(actionRow);

      // Afficher le modal (ceci acknowledge automatiquement l'interaction)
      await interaction.showModal(modal);
    } catch (error) {
      console.error("Erreur lors de l'affichage du modal de garantie:", error);

      // Si showModal() a échoué, l'interaction n'est pas acknowledged
      // Vérifier d'abord si l'interaction n'a pas déjà été acknowledgée
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content:
              "An error occurred while opening the activation form. Please try again.",
            flags: MessageFlags.Ephemeral,
          });
        } catch (replyError) {
          console.error("Impossible de répondre à l'interaction:", replyError);
        }
      }
    }
  },
};
