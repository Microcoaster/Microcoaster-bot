/**
 * Groupe utilisateur - Sous-commande : avatar
 * Affiche l'avatar d'un utilisateur
 */

const { EmbedBuilder } = require("discord.js");

module.exports = {
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    
    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle(`🖼️ Avatar de ${targetUser.username}`)
      .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(`[Lien direct vers l'avatar](${targetUser.displayAvatarURL({ dynamic: true, size: 1024 })})`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
