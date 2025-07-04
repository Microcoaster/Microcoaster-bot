/**
 * Module de commande "exemple2"
 *
 * Cette commande envoie un message simple de test.
 * C'est un exemple basique d'une commande slash qui répond avec un embed simple.
 */

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  // Définition de la commande slash "exemple2"
  data: new SlashCommandBuilder()
    .setName("exemple2")
    .setDescription("Commande de test simple"),

  async execute(interaction) {
    // Création de l'embed contenant le message de test
    const embed = new EmbedBuilder()
      .setTitle("🧪 Commande de Test")
      .setDescription("Ceci est une commande de test")
      .setColor(0x00FF00)
      .setFooter({
        text: "Test réussi !",
      })
      .setTimestamp();

    // Envoi de l'embed en réponse à la commande
    await interaction.reply({ embeds: [embed] });
  },
};
