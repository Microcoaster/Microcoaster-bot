/**
 * Sous-commande : xp
 * Ajoute de l'expérience à un utilisateur (commande de test)
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
    await exempleDAO.incrementCommandUsage(interaction.user.id, "bdd-exemple xp");

    const xpAmount = interaction.options.getInteger("quantite");
    
    try {
      const result = await exempleDAO.addExperience(interaction.user.id, xpAmount);
      
      const embed = new EmbedBuilder()
        .setColor(result.levelUp ? 0x00FF00 : 0x0099FF)
        .setTitle(result.levelUp ? "🎉 Niveau supérieur !" : "⭐ Expérience gagnée !")
        .addFields(
          { name: "💫 XP gagnée", value: `+${result.xpGained} XP`, inline: true },
          { name: "📊 XP totale", value: `${result.totalXP} XP`, inline: true },
          { name: "🎯 Niveau", value: result.levelUp ? `${result.oldLevel} → ${result.newLevel}` : result.newLevel.toString(), inline: true }
        );

      if (result.levelUp) {
        embed.setDescription(`Félicitations ! Vous êtes passé du niveau ${result.oldLevel} au niveau ${result.newLevel} !`);
        
        // Récompense bonus pour le level up
        await exempleDAO.updateUser(interaction.user.id, { 
          coins: (await exempleDAO.getUser(interaction.user.id)).coins + (result.newLevel * 50) 
        });
        
        embed.addFields({ name: "🎁 Bonus", value: `+${result.newLevel * 50} coins pour le passage de niveau !`, inline: false });
      }

      embed.addFields({ 
        name: "🎯 Prochain niveau", 
        value: `${result.nextLevelXP - result.totalXP} XP restantes`, 
        inline: false 
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erreur lors de l'ajout d'XP:", error);
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'ajout d'expérience.",
        ephemeral: true
      });
    }
  },
};
