/**
 * Sous-commande : stats
 * Affiche les statistiques d'utilisation du bot pour l'utilisateur
 */

const { EmbedBuilder } = require("discord.js");
const exempleDAO = require("../../dao/exempleDAO");

module.exports = {
  async execute(interaction) {
    // S'assurer que l'utilisateur existe en base
    await exempleDAO.createUser(
      interaction.user.id,
      interaction.user.username,
      interaction.user.displayName
    );

    // Incrémenter l'usage de commande
    await exempleDAO.incrementCommandUsage(interaction.user.id, "bdd-exemple stats");

    const userData = await exempleDAO.getUser(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setColor(0x9932CC)
      .setTitle("📊 Vos Statistiques")
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "🎮 Commandes utilisées", value: userData.commands_used.toString(), inline: true },
        { name: "💬 Messages envoyés", value: userData.messages_sent.toString(), inline: true },
        { name: "⏰ Temps en ligne", value: `${Math.floor(userData.time_online / 60)}h ${userData.time_online % 60}m`, inline: true },
        { name: "🎯 Niveau actuel", value: userData.level.toString(), inline: true },
        { name: "⭐ Expérience totale", value: `${userData.experience} XP`, inline: true },
        { name: "💰 Coins possédés", value: userData.coins.toString(), inline: true }
      )
      .setFooter({ text: "Utilisez les commandes pour gagner de l'XP !" })
      .setTimestamp();

    if (userData.favorite_command) {
      embed.addFields({ name: "⭐ Commande favorite", value: userData.favorite_command, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
