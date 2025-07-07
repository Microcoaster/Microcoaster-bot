const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod-config")
    .setDescription(
      "⚙️ [ADMIN] Configuration du système de modération simplifié",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Vérifier les permissions
      const config = require("../config/config.json");
      const member = await interaction.guild.members.fetch(interaction.user.id);

      const isAdmin =
        member.permissions.has("Administrator") ||
        member.roles.cache.has(config.roles.admin_role_id);

      if (!isAdmin) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Accès refusé")
          .setDescription(
            "Seuls les administrateurs peuvent voir la configuration.",
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Récupérer les rôles staff pour l'affichage
      const staffRoles = [
        config.roles?.admin_role_id,
        config.roles?.support_team_role_id,
        config.roles?.technical_team_role_id,
        config.roles?.business_team_role_id,
        config.roles?.recruitment_team_role_id,
      ].filter(Boolean);

      const staffRolesList =
        staffRoles.map((roleId) => `<@&${roleId}>`).join("\n") ||
        "Aucun configuré";

      const configEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("⚙️ Configuration Modération Simplifiée")
        .setDescription(
          "Configuration actuelle du système de modération simplifié.",
        )
        .addFields(
          {
            name: "🎯 Règles de détection",
            value:
              "• Liens Discord (`discord.gg/`, `discordapp.com/invite/`, `discord.com/invite/`, `dsc.gg/`)",
            inline: false,
          },
          {
            name: "⚡ Actions automatiques",
            value:
              "• **Suppression immédiate** des messages avec liens Discord\n• **Message d'avertissement** temporaire (supprimé après 5 secondes)",
            inline: false,
          },
          {
            name: "👮 Rôles exemptés",
            value: staffRolesList,
            inline: false,
          },
          {
            name: "🔧 Configuration",
            value:
              "Ce système est codé en dur et ne peut pas être modifié via des commandes.",
            inline: false,
          },
          {
            name: "📊 Statut",
            value:
              "🟢 **Actif** - Le système surveille activement les messages",
            inline: false,
          },
        )
        .setFooter({ text: "MicroCoaster™ Modération Simplifiée" })
        .setTimestamp();

      await interaction.editReply({ embeds: [configEmbed] });
    } catch (error) {
      console.error("Erreur dans automod-config:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Erreur")
        .setDescription(
          "Une erreur s'est produite lors de la récupération de la configuration.",
        )
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({
          embeds: [errorEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
