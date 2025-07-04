const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  execute: async (interaction) => {
    try {
      // Créer le modal pour la saisie du code de garantie
      const modal = new ModalBuilder()
        .setCustomId('warranty_activation_modal')
        .setTitle('🎫 Activate Your Premium Code');

      // Champ pour le code de garantie
      const codeInput = new TextInputBuilder()
        .setCustomId('warranty_code')
        .setLabel('Enter your premium/warranty code')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('565486512094')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(50);

      // Ajouter le champ dans une ActionRow
      const actionRow = new ActionRowBuilder().addComponents(codeInput);
      
      // Ajouter l'ActionRow au modal
      modal.addComponents(actionRow);

      // Afficher le modal
      await interaction.showModal(modal);

    } catch (error) {
      console.error('Erreur lors de l\'affichage du modal de garantie:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: 'An error occurred while opening the activation form. Please try again.', 
          ephemeral: true 
        });
      }
    }
  }
};
