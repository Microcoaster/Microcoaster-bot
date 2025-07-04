/**
 * Sous-commande : classement
 * Affiche le classement des utilisateurs par niveau et expérience
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
    await exempleDAO.incrementCommandUsage(interaction.user.id, "bdd-exemple classement");

    const limit = interaction.options.getInteger("limite") || 10;
    const leaderboard = await exempleDAO.getLeaderboard(limit);

    if (leaderboard.length === 0) {
      return await interaction.reply({
        content: "📊 Aucun utilisateur trouvé dans le classement.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle("🏆 Classement des Utilisateurs")
      .setDescription("Classement par niveau et expérience")
      .setTimestamp();

    let description = "";
    leaderboard.forEach((user, index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
      const name = user.display_name || user.username;
      description += `${medal} **${name}** - Niveau ${user.level} (${user.experience} XP)\n`;
    });

    embed.setDescription(description);

    await interaction.reply({ embeds: [embed] });
  },
};
