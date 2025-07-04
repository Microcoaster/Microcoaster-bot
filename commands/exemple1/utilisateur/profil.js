/**
 * Groupe utilisateur - Sous-commande : profil
 * Affiche le profil d'un utilisateur
 */

const { EmbedBuilder } = require("discord.js");

module.exports = {
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    const embed = new EmbedBuilder()
      .setColor(0x9932CC)
      .setTitle(`👤 Profil de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "Nom d'utilisateur", value: targetUser.username, inline: true },
        { name: "ID", value: targetUser.id, inline: true },
        { name: "Compte créé le", value: targetUser.createdAt.toLocaleDateString("fr-FR"), inline: true }
      );

    if (member) {
      embed.addFields(
        { name: "Surnom", value: member.nickname || "Aucun", inline: true },
        { name: "A rejoint le", value: member.joinedAt.toLocaleDateString("fr-FR"), inline: true },
        { name: "Rôles", value: member.roles.cache.filter(role => role.name !== "@everyone").map(role => role.toString()).join(", ") || "Aucun", inline: false }
      );
    }

    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
