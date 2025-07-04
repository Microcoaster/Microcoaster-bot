/**
 * Sous-commande : info
 * Affiche des informations générales selon le type sélectionné
 */

const { EmbedBuilder } = require("discord.js");

module.exports = {
  async execute(interaction) {
    const type = interaction.options.getString("type") || "bot";
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTimestamp();

    switch (type) {
      case "bot":
        embed
          .setTitle("🤖 Informations du Bot")
          .setDescription("Voici les informations du bot")
          .addFields(
            { name: "Nom", value: interaction.client.user.username, inline: true },
            { name: "ID", value: interaction.client.user.id, inline: true },
            { name: "Serveurs", value: interaction.client.guilds.cache.size.toString(), inline: true }
          )
          .setThumbnail(interaction.client.user.displayAvatarURL());
        break;
        
      case "server":
        embed
          .setTitle("🏠 Informations du Serveur")
          .setDescription("Voici les informations du serveur")
          .addFields(
            { name: "Nom", value: interaction.guild.name, inline: true },
            { name: "Membres", value: interaction.guild.memberCount.toString(), inline: true },
            { name: "Créé le", value: interaction.guild.createdAt.toLocaleDateString("fr-FR"), inline: true }
          )
          .setThumbnail(interaction.guild.iconURL());
        break;
        
      case "user":
        const user = interaction.user;
        embed
          .setTitle("👤 Vos Informations")
          .setDescription("Voici vos informations")
          .addFields(
            { name: "Nom", value: user.username, inline: true },
            { name: "ID", value: user.id, inline: true },
            { name: "Compte créé le", value: user.createdAt.toLocaleDateString("fr-FR"), inline: true }
          )
          .setThumbnail(user.displayAvatarURL());
        break;
    }

    await interaction.reply({ embeds: [embed] });
  },
};
