/**
 * Groupe moderation - Sous-commande : warn
 * Avertit un utilisateur (exemple de commande de modération)
 */

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  async execute(interaction) {
    // Vérification des permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return await interaction.reply({
        content: "❌ Vous n'avez pas les permissions nécessaires pour utiliser cette commande.",
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser("user");
    const reason = interaction.options.getString("raison") || "Aucune raison spécifiée";
    
    // Vérification que l'utilisateur ne s'avertit pas lui-même
    if (targetUser.id === interaction.user.id) {
      return await interaction.reply({
        content: "❌ Vous ne pouvez pas vous avertir vous-même !",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle("⚠️ Avertissement")
      .setDescription(`${targetUser} a été averti.`)
      .addFields(
        { name: "Utilisateur averti", value: targetUser.toString(), inline: true },
        { name: "Modérateur", value: interaction.user.toString(), inline: true },
        { name: "Raison", value: reason, inline: false }
      )
      .setTimestamp();

    // Message privé à l'utilisateur averti (optionnel)
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle("⚠️ Vous avez reçu un avertissement")
        .setDescription(`Vous avez été averti sur le serveur **${interaction.guild.name}**.`)
        .addFields(
          { name: "Raison", value: reason, inline: false },
          { name: "Modérateur", value: interaction.user.username, inline: true }
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
    } catch (error) {
      // L'utilisateur a probablement ses DM fermés
      embed.setFooter({ text: "Note : L'utilisateur n'a pas pu être notifié en privé." });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
