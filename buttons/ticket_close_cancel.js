/**
 * Handler pour annuler la fermeture d'un ticket
 */

const { MessageFlags } = require('discord.js');

module.exports = {
  execute: async (interaction) => {
    try {
      // Simplement fermer la confirmation et éditer le message
      await interaction.update({
        content: '❌ Ticket closure cancelled.',
        embeds: [],
        components: []
      });

      console.log(`\x1b[38;5;3m🚫 Fermeture de ticket annulée par ${interaction.user.username}\x1b[0m`);

    } catch (error) {
      console.error('Erreur lors de l\'annulation de fermeture:', error);
      
      await interaction.reply({ 
        content: '❌ An error occurred while cancelling ticket closure.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }
};
