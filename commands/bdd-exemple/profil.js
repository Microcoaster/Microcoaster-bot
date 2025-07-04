/**
 * Sous-commande : profil
 * Affiche le profil d'un utilisateur avec ses statistiques
 */

const { EmbedBuilder } = require("discord.js");
const exempleDAO = require("../../dao/exempleDAO");

module.exports = {
  async execute(interaction) {
    const targetUser = interaction.options.getUser("utilisateur") || interaction.user;
    
    // S'assurer que l'utilisateur existe en base
    await exempleDAO.createUser(
      interaction.user.id,
      interaction.user.username,
      interaction.user.displayName
    );

    // S'assurer que l'utilisateur cible existe
    await exempleDAO.createUser(
      targetUser.id,
      targetUser.username,
      targetUser.displayName
    );

    // Incrémenter l'usage de commande
    await exempleDAO.incrementCommandUsage(interaction.user.id, "bdd-exemple profil");

    const userData = await exempleDAO.getUser(targetUser.id);
    
    if (!userData) {
      return await interaction.reply({
        content: "❌ Impossible de récupérer les données de cet utilisateur.",
        ephemeral: true
      });
    }

    // Calculer XP pour niveau suivant
    const nextLevelXP = Math.pow(userData.level, 2) * 100;
    const currentLevelXP = Math.pow(userData.level - 1, 2) * 100;
    const progressXP = userData.experience - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle(`👤 Profil de ${userData.display_name || userData.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "🏷️ Nom d'utilisateur", value: userData.username, inline: true },
        { name: "🎯 Niveau", value: userData.level.toString(), inline: true },
        { name: "⭐ Expérience", value: `${userData.experience} XP`, inline: true },
        { name: "💰 Coins", value: userData.coins.toString(), inline: true },
        { name: "👑 Premium", value: userData.is_premium ? "Oui" : "Non", inline: true },
        { name: "📊 Commandes utilisées", value: userData.commands_used.toString(), inline: true },
        { name: "📈 Progression", value: `${progressXP}/${neededXP} XP vers niveau ${userData.level + 1}`, inline: false },
        { name: "📅 Membre depuis", value: new Date(userData.join_date).toLocaleDateString("fr-FR"), inline: true },
        { name: "🕐 Dernière activité", value: new Date(userData.last_activity).toLocaleDateString("fr-FR"), inline: true }
      );

    if (userData.favorite_command) {
      embed.addFields({ name: "⭐ Commande favorite", value: userData.favorite_command, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
