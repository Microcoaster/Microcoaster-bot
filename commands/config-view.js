const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config-view")
    .setDescription("View current bot configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Lire la configuration actuelle
      const configPath = path.join(__dirname, "../config/config.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

      // Créer l'embed principal
      const configEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("⚙️ Current Bot Configuration")
        .setDescription("Below is the current configuration of the bot.")
        .setTimestamp();

      // Section Rôles
      const roleFields = [
        { key: "premium_role_id", name: "Premium Role" },
        { key: "warranty_role_id", name: "Warranty Role" },
        { key: "member_role_id", name: "Member Role" },
        { key: "admin_role_id", name: "Admin Role" },
        { key: "support_team_role_id", name: "Support Team" },
        { key: "technical_team_role_id", name: "Technical Team" },
        { key: "business_team_role_id", name: "Business Team" },
        { key: "recruitment_team_role_id", name: "Recruitment Team" },
      ];

      let rolesValue = "";
      for (const field of roleFields) {
        const roleId = config.roles
          ? config.roles[field.key]
          : config[field.key];
        if (roleId && !roleId.startsWith("YOUR_")) {
          const role = interaction.guild.roles.cache.get(roleId);
          rolesValue += `**${field.name}:** ${role ? role.name : "Unknown Role"}\n`;
        } else {
          rolesValue += `**${field.name}:** Not configured\n`;
        }
      }

      configEmbed.addFields({
        name: "🎭 Roles Configuration",
        value: rolesValue || "No roles configured",
        inline: false,
      });

      // Section Canaux
      const channelFields = [
        { key: "warranty_activation_channel_id", name: "Warranty Activation" },
        { key: "support_channel_id", name: "Support Channel" },
        { key: "logs_moderation_channel_id", name: "Moderation Logs" },
        { key: "role_logs_channel_id", name: "Role Logs" },
      ];

      let channelsValue = "";
      for (const field of channelFields) {
        const channelId = config.channels
          ? config.channels[field.key]
          : config[field.key];
        if (channelId && !channelId.startsWith("YOUR_")) {
          const channel = interaction.guild.channels.cache.get(channelId);
          channelsValue += `**${field.name}:** ${channel ? channel.name : "Unknown Channel"}\n`;
        } else {
          channelsValue += `**${field.name}:** Not configured\n`;
        }
      }

      configEmbed.addFields({
        name: "📢 Channels Configuration",
        value: channelsValue || "No channels configured",
        inline: false,
      });

      // Section Catégories
      const categoryFields = [
        { key: "technical_category_id", name: "Technical Support" },
        { key: "product_category_id", name: "Product Support" },
        { key: "business_category_id", name: "Business Inquiries" },
        { key: "recruitment_category_id", name: "Recruitment" },
      ];

      let categoriesValue = "";
      for (const field of categoryFields) {
        const categoryId = config.categories
          ? config.categories[field.key]
          : config[field.key];
        if (categoryId && !categoryId.startsWith("YOUR_")) {
          const category = interaction.guild.channels.cache.get(categoryId);
          categoriesValue += `**${field.name}:** ${category ? category.name : "Unknown Category"}\n`;
        } else {
          categoriesValue += `**${field.name}:** Not configured\n`;
        }
      }

      configEmbed.addFields({
        name: "📁 Categories Configuration",
        value: categoriesValue || "No categories configured",
        inline: false,
      });

      // Section Paramètres Bot
      const botConfig = config.bot || {};
      const botValue =
        `**Prefix:** ${botConfig.prefix || config.bot_prefix || "/"}\n` +
        `**Status:** ${botConfig.status || config.bot_status || "Not set"}\n` +
        `**Activity Type:** ${botConfig.activity_type || config.bot_activity_type || "WATCHING"}`;

      configEmbed.addFields({
        name: "🤖 Bot Settings",
        value: botValue,
        inline: true,
      });

      // Section Paramètres Garantie
      const warrantyConfig = config.warranty || {};
      const warrantyValue =
        `**Default Duration:** ${warrantyConfig.default_duration_months || config.default_warranty_duration_months || 12} months\n` +
        `**Max Attempts:** ${warrantyConfig.max_activation_attempts || config.max_activation_attempts || 3}\n` +
        `**Cleanup Interval:** ${warrantyConfig.cleanup_interval_hours || config.cleanup_interval_hours || 24} hours\n` +
        `**Reminder Days:** ${Array.isArray(warrantyConfig.reminder_days) ? warrantyConfig.reminder_days.join(", ") : warrantyConfig.reminder_days || config.warranty_reminder_days || "[30, 7]"}`;

      configEmbed.addFields({
        name: "🛡️ Warranty Settings",
        value: warrantyValue,
        inline: true,
      });

      // Section Paramètres Tickets
      const ticketsConfig = config.tickets || {};
      const ticketValue =
        `**Max Per User:** ${ticketsConfig.max_tickets_per_user || config.max_tickets_per_user || 3}\n` +
        `**Default Priority:** ${ticketsConfig.default_priority || config.default_ticket_priority || "medium"}`;

      configEmbed.addFields({
        name: "🎫 Ticket Settings",
        value: ticketValue,
        inline: true,
      });

      // Ajouter informations sur la configuration
      const configStats = await getConfigurationStats(config);

      configEmbed.addFields({
        name: "📊 Configuration Status",
        value:
          `**Configured Items:** ${configStats.configured}/${configStats.total}\n` +
          `**Completion:** ${Math.round((configStats.configured / configStats.total) * 100)}%\n` +
          `**Last Modified:** ${getLastModified(configPath)}`,
        inline: false,
      });

      await interaction.editReply({ embeds: [configEmbed] });
    } catch (error) {
      console.error("Erreur lors de l'affichage de la configuration:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Error")
        .setDescription("An error occurred while loading the configuration.")
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

/**
 * Calcule les statistiques de configuration
 */
async function getConfigurationStats(config) {
  const configFields = [
    "premium_role_id",
    "warranty_role_id",
    "member_role_id",
    "admin_role_id",
    "support_team_role_id",
    "technical_team_role_id",
    "business_team_role_id",
    "recruitment_team_role_id",
    "warranty_activation_channel_id",
    "support_channel_id",
    "logs_moderation_channel_id",
    "role_logs_channel_id",
    "technical_category_id",
    "product_category_id",
    "business_category_id",
    "recruitment_category_id",
  ];

  let configured = 0;
  const total = configFields.length;

  for (const field of configFields) {
    const value = config[field];
    if (value && !value.startsWith("YOUR_")) {
      configured++;
    }
  }

  return { configured, total };
}

/**
 * Obtient la date de dernière modification du fichier de configuration
 */
function getLastModified(configPath) {
  try {
    const stats = fs.statSync(configPath);
    return `<t:${Math.floor(stats.mtime.getTime() / 1000)}:R>`;
  } catch {
    return "Unknown";
  }
}
