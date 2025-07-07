const SimpleModerationSystem = require("../utils/simpleModerationSystem");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    try {
      // Ignorer les messages vides ou les bots
      if (!message.content || message.author.bot) return;

      // Ignorer les DMs
      if (!message.guild) return;

      // Initialiser le système de modération simplifié s'il n'existe pas
      if (!client.simpleModerationSystem) {
        client.simpleModerationSystem = new SimpleModerationSystem(client);
      }

      // Traiter le message pour la détection des liens Discord
      await client.simpleModerationSystem.processMessage(message);
    } catch (error) {
      console.error("Erreur dans messageCreate:", error);
    }
  },
};
