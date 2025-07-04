/**
 * Groupe moderation - Sous-commande : kick
 * Expulse un utilisateur du serveur (exemple de commande de modération)
 */

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  async execute(interaction) {
    // Vérification des permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return await interaction.reply({
        content: "❌ Vous n'avez pas les permissions nécessaires pour utiliser cette commande.",
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser("user");
    const reason = interaction.options.getString("raison") || "Aucune raison spécifiée";
    
    // Vérification que l'utilisateur ne s'expulse pas lui-même
    if (targetUser.id === interaction.user.id) {
      return await interaction.reply({
        content: "❌ Vous ne pouvez pas vous expulser vous-même !",
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!member) {
      return await interaction.reply({
        content: "❌ Cet utilisateur n'est pas sur le serveur.",
        ephemeral: true
      });
    }

    // Vérification des permissions hiérarchiques
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return await interaction.reply({
        content: "❌ Vous ne pouvez pas expulser cet utilisateur (rôle supérieur ou égal).",
        ephemeral: true
      });
    }

    try {
      // Message privé avant l'expulsion
      const dmEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🚪 Vous avez été expulsé")
        .setDescription(`Vous avez été expulsé du serveur **${interaction.guild.name}**.`)
        .addFields(
          { name: "Raison", value: reason, inline: false },
          { name: "Modérateur", value: interaction.user.username, inline: true }
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
    } catch (error) {
      // L'utilisateur a probablement ses DM fermés
    }

    // Expulsion
    await member.kick(reason);

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle("🚪 Expulsion")
      .setDescription(`${targetUser} a été expulsé du serveur.`)
      .addFields(
        { name: "Utilisateur expulsé", value: targetUser.toString(), inline: true },
        { name: "Modérateur", value: interaction.user.toString(), inline: true },
        { name: "Raison", value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
