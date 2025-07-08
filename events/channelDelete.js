/**
 * Gestionnaire de l'événement "channelDelete".
 *
 * Ce module est déclenché lorsqu'un salon Discord est supprimé.
 * Il vérifie si c'était un salon de ticket et le supprime de la base de données.
 */

const TicketDAO = require("../dao/ticketDAO");
const ticketDAO = new TicketDAO();

module.exports = {
  name: "channelDelete",
  /**
   * Méthode exécutée lors de la suppression d'un salon
   *
   * @param {Channel} channel - Le salon qui a été supprimé
   */
  async execute(channel) {
    try {
      // Vérifier si c'était un salon de ticket
      const ticket = await ticketDAO.getTicketByChannelId(channel.id);

      if (ticket) {
        console.log(
          `\x1b[38;5;3m🗑️  Salon de ticket supprimé détecté: ${channel.name} (${channel.id})\x1b[0m`,
        );
        console.log(
          `\x1b[38;5;3m📋 Ticket associé: ${ticket.ticket_id}\x1b[0m`,
        );

        // Supprimer le ticket de la base de données
        const deleted = await ticketDAO.deleteTicketByChannelId(channel.id);

        if (deleted) {
          console.log(
            `\x1b[38;5;2m✅ Ticket ${ticket.ticket_id} supprimé de la base de données\x1b[0m`,
          );
        } else {
          console.log(
            `\x1b[38;5;1m❌ Échec de la suppression du ticket ${ticket.ticket_id} de la base de données\x1b[0m`,
          );
        }
      }
    } catch (error) {
      console.error(
        `\x1b[38;5;1m❌ Erreur lors de la gestion de la suppression du salon ${channel.id}: ${error.message}\x1b[0m`,
      );
    }
  },
};
