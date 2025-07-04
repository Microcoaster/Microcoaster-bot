/**
 * Sous-commande : test
 * Commande de test simple qui renvoie un message
 */

const { EmbedBuilder } = require("discord.js");

module.exports = {
  async execute(interaction) {
    const message = interaction.options.getString("message") || "Test réussi !";
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle("🧪 Test")
      .setDescription(`Message de test : **${message}**`)
      .addFields(
        { name: "Utilisateur", value: interaction.user.username, inline: true },
        { name: "Canal", value: interaction.channel.name, inline: true },
        { name: "Heure", value: new Date().toLocaleTimeString("fr-FR"), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
