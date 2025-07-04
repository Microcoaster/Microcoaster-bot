/**
 * Commande exemple avec boutons
 * 
 * Cette commande démontre comment créer et utiliser des boutons dans Discord.js
 * Elle envoie un message avec plusieurs boutons d'exemple.
 */

const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bouton-exemple")
    .setDescription("Démontre l'utilisation de boutons avec des exemples"),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Création de l'embed principal
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle("🔘 Exemple de Boutons")
      .setDescription("Cliquez sur les boutons ci-dessous pour tester leurs fonctionnalités !")
      .addFields(
        { name: "👍 Like", value: "Bouton pour aimer", inline: true },
        { name: "👎 Dislike", value: "Bouton pour ne pas aimer", inline: true },
        { name: "ℹ️ Info", value: "Bouton d'information", inline: true },
        { name: "🔄 Reset", value: "Bouton pour réinitialiser", inline: true }
      )
      .setFooter({ text: "Les boutons sont personnalisés pour vous !" })
      .setTimestamp();

    // Création des boutons
    // Première rangée de boutons
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`exemple:like:${userId}`)
          .setLabel("👍 J'aime")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`exemple:dislike:${userId}`)
          .setLabel("👎 Je n'aime pas")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`exemple:info:user:${userId}`)
          .setLabel("ℹ️ Mes infos")
          .setStyle(ButtonStyle.Primary)
      );

    // Deuxième rangée de boutons
    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("exemple:reset")
          .setLabel("🔄 Réinitialiser")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setURL("https://discord.js.org/")
          .setLabel("📚 Documentation")
          .setStyle(ButtonStyle.Link)
      );

    // Envoi du message avec embed et boutons
    await interaction.reply({
      embeds: [embed],
      components: [row1, row2]
    });
  },
};
