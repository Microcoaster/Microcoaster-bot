/**
 * Exemple de gestionnaire de bouton
 * 
 * Ce fichier gère les interactions avec les boutons ayant un customId commençant par "exemple:"
 * 
 * Format du customId : "exemple:action:param1:param2..."
 * Exemples :
 * - "exemple:like:123" 
 * - "exemple:dislike:123"
 * - "exemple:info:user:456"
 */

const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  async execute(interaction, params) {
    // params contient tout ce qui vient après "exemple:" dans le customId
    // Par exemple, pour "exemple:like:123", params = ["like", "123"]
    const [action, userId, ...extraParams] = params;

    // Vérification que l'utilisateur qui clique est autorisé (optionnel)
    if (userId && interaction.user.id !== userId) {
      return await interaction.reply({
        content: "❌ Vous n'êtes pas autorisé à utiliser ce bouton.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Gestion des différentes actions
    switch (action) {
      case "like":
        await handleLike(interaction, userId);
        break;
        
      case "dislike":
        await handleDislike(interaction, userId);
        break;
        
      case "info":
        await handleInfo(interaction, extraParams);
        break;
        
      case "reset":
        await handleReset(interaction);
        break;
        
      default:
        await interaction.reply({
          content: `❌ Action "${action}" non reconnue.`,
          flags: MessageFlags.Ephemeral,
        });
    }
  },
};

/**
 * Gère l'action "like"
 */
async function handleLike(interaction, userId) {
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle("👍 J'aime !")
    .setDescription(`${interaction.user} a aimé ce message !`)
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Gère l'action "dislike"
 */
async function handleDislike(interaction, userId) {
  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle("👎 Je n'aime pas")
    .setDescription(`${interaction.user} n'a pas aimé ce message.`)
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Gère l'action "info"
 */
async function handleInfo(interaction, extraParams) {
  const [type, id] = extraParams;
  
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle("ℹ️ Informations")
    .setDescription("Voici les informations demandées :")
    .addFields(
      { name: "Type", value: type || "Non spécifié", inline: true },
      { name: "ID", value: id || "Non spécifié", inline: true },
      { name: "Utilisateur", value: interaction.user.username, inline: true }
    )
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Gère l'action "reset"
 */
async function handleReset(interaction) {
  await interaction.update({
    content: "🔄 Message réinitialisé !",
    components: [],
    embeds: []
  });
}
