const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// Mapping des configurations avec leurs descriptions et validations
const configCategories = {
  roles: {
    title: "🎭 Roles Configuration",
    description: "Configure Discord roles used by the bot",
    fields: {
      premium_role_id: {
        name: "Premium Role",
        description: "Role given to users with premium codes",
        type: "role",
      },
      warranty_role_id: {
        name: "Warranty Role",
        description: "Role given to users with active warranties",
        type: "role",
      },
      admin_role_id: {
        name: "Admin Role",
        description: "Role for bot administrators",
        type: "role",
      },
      support_team_role_id: {
        name: "Support Team Role",
        description: "Role for support team members",
        type: "role",
      },
      technical_team_role_id: {
        name: "Technical Team Role",
        description: "Role for technical support team",
        type: "role",
      },
      business_team_role_id: {
        name: "Business Team Role",
        description: "Role for business team members",
        type: "role",
      },
      recruitment_team_role_id: {
        name: "Recruitment Team Role",
        description: "Role for recruitment team",
        type: "role",
      },
    },
  },
  channels: {
    title: "📢 Channels Configuration",
    description: "Configure Discord channels used by the bot",
    fields: {
      warranty_activation_channel_id: {
        name: "Warranty Activation Channel",
        description: "Channel for warranty code activation",
        type: "channel",
      },
      support_channel_id: {
        name: "Support Channel",
        description: "Channel for creating support tickets",
        type: "channel",
      },
      logs_moderation_channel_id: {
        name: "Moderation Logs Channel",
        description: "Channel for moderation logs",
        type: "channel",
      },
      bot_stats_channel_id: {
        name: "Bot Stats Channel",
        description: "Channel for bot statistics",
        type: "channel",
      },
      role_logs_channel_id: {
        name: "Role Logs Channel",
        description: "Channel for role restoration logs",
        type: "channel",
      },
    },
  },
  categories: {
    title: "📁 Categories Configuration",
    description: "Configure Discord categories for ticket organization",
    fields: {
      technical_category_id: {
        name: "Technical Category",
        description: "Category for technical support tickets",
        type: "category",
      },
      product_category_id: {
        name: "Product Category",
        description: "Category for product support tickets",
        type: "category",
      },
      business_category_id: {
        name: "Business Category",
        description: "Category for business inquiry tickets",
        type: "category",
      },
      recruitment_category_id: {
        name: "Recruitment Category",
        description: "Category for recruitment applications",
        type: "category",
      },
    },
  },
  bot: {
    title: "🤖 Bot Settings",
    description: "Configure bot behavior and status",
    fields: {
      prefix: {
        name: "Bot Prefix",
        description: "Command prefix for the bot",
        type: "text",
      },
      status: {
        name: "Bot Status",
        description: "Status message displayed by the bot",
        type: "text",
      },
      activity_type: {
        name: "Activity Type",
        description:
          "Type of activity (PLAYING, WATCHING, LISTENING, STREAMING)",
        type: "select",
        options: ["PLAYING", "WATCHING", "LISTENING", "STREAMING"],
      },
    },
  },
  warranty: {
    title: "🛡️ Warranty Settings",
    description: "Configure warranty system parameters",
    fields: {
      default_duration_months: {
        name: "Default Duration (months)",
        description: "Default warranty duration in months",
        type: "number",
        min: 1,
        max: 120,
      },
      reminder_days: {
        name: "Reminder Days",
        description: "Days before expiry to send reminders (comma-separated)",
        type: "text",
      },
      max_activation_attempts: {
        name: "Max Activation Attempts",
        description: "Maximum code activation attempts per user/hour",
        type: "number",
        min: 1,
        max: 10,
      },
      cleanup_interval_hours: {
        name: "Cleanup Interval (hours)",
        description: "Hours between automatic cleanup tasks",
        type: "number",
        min: 1,
        max: 168,
      },
    },
  },
  tickets: {
    title: "🎫 Ticket Settings",
    description: "Configure ticket system parameters",
    fields: {
      auto_close_after_hours: {
        name: "Auto Close After (hours)",
        description: "Hours before inactive tickets auto-close",
        type: "number",
        min: 1,
        max: 720,
      },
      max_tickets_per_user: {
        name: "Max Tickets Per User",
        description: "Maximum active tickets per user",
        type: "number",
        min: 1,
        max: 10,
      },
      default_priority: {
        name: "Default Priority",
        description: "Default priority for new tickets",
        type: "select",
        options: ["low", "medium", "high", "urgent"],
      },
    },
  },
};

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    // Vérifier si c'est un menu de configuration
    if (
      !interaction.isStringSelectMenu() ||
      !interaction.customId.startsWith("config_")
    ) {
      return;
    }

    try {
      await interaction.deferUpdate();

      const configPath = path.join(__dirname, "../config/config.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

      if (interaction.customId === "config_main_menu") {
        // Menu principal - afficher les sous-options
        const category = interaction.values[0];
        const categoryConfig = configCategories[category];

        if (!categoryConfig) {
          await interaction.followUp({
            content: "Category not found!",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Créer l'embed pour la catégorie
        const categoryEmbed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle(categoryConfig.title)
          .setDescription(categoryConfig.description);

        // Ajouter les champs actuels
        for (const [key, field] of Object.entries(categoryConfig.fields)) {
          let currentValue = config[key] || "Not set";

          // Formater la valeur selon le type
          if (field.type === "role" && currentValue !== "Not set") {
            const role = interaction.guild.roles.cache.get(currentValue);
            currentValue = role
              ? `${role.name} (${role.id})`
              : `Unknown Role (${currentValue})`;
          } else if (field.type === "channel" && currentValue !== "Not set") {
            const channel = interaction.guild.channels.cache.get(currentValue);
            currentValue = channel
              ? `${channel.name} (${channel.id})`
              : `Unknown Channel (${currentValue})`;
          } else if (field.type === "category" && currentValue !== "Not set") {
            const category = interaction.guild.channels.cache.get(currentValue);
            currentValue = category
              ? `${category.name} (${category.id})`
              : `Unknown Category (${currentValue})`;
          }

          categoryEmbed.addFields({
            name: field.name,
            value: `**Current:** ${currentValue}\n*${field.description}*`,
            inline: false,
          });
        }

        // Créer le menu de sélection pour les champs
        const fieldOptions = Object.entries(categoryConfig.fields).map(
          ([key, field]) => ({
            label: field.name,
            description: field.description.substring(0, 100),
            value: `${category}_${key}`,
            emoji: getFieldEmoji(field.type),
          }),
        );

        const fieldMenu = new StringSelectMenuBuilder()
          .setCustomId("config_field_menu")
          .setPlaceholder("Select a setting to modify")
          .addOptions(fieldOptions);

        // Ajouter option pour revenir au menu principal
        fieldMenu.addOptions({
          label: "← Back to Main Menu",
          description: "Return to the main configuration menu",
          value: "back_to_main",
          emoji: "↩️",
        });

        const actionRow = new ActionRowBuilder().addComponents(fieldMenu);

        await interaction.editReply({
          embeds: [categoryEmbed],
          components: [actionRow],
        });
      } else if (interaction.customId === "config_field_menu") {
        // Menu de champ - afficher le modal ou les options
        const selectedValue = interaction.values[0];

        if (selectedValue === "back_to_main") {
          // Retourner au menu principal
          const mainEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("⚙️ Bot Configuration Manager")
            .setDescription(
              "Use the dropdown menu below to configure different aspects of the bot.",
            )
            .addFields(
              {
                name: "🎭 Roles",
                value: "Configure Discord roles used by the bot",
                inline: true,
              },
              {
                name: "📢 Channels",
                value: "Configure Discord channels used by the bot",
                inline: true,
              },
              {
                name: "📁 Categories",
                value: "Configure Discord categories for tickets",
                inline: true,
              },
              {
                name: "🤖 Bot Settings",
                value: "Configure bot behavior and status",
                inline: true,
              },
              {
                name: "🛡️ Warranty Settings",
                value: "Configure warranty system parameters",
                inline: true,
              },
              {
                name: "🎫 Ticket Settings",
                value: "Configure ticket system parameters",
                inline: true,
              },
            )
            .setFooter({ text: "Select a category to modify its settings" })
            .setTimestamp();

          const mainMenu = new StringSelectMenuBuilder()
            .setCustomId("config_main_menu")
            .setPlaceholder("Select a configuration category")
            .addOptions([
              {
                label: "Roles Configuration",
                description: "Configure Discord roles",
                value: "roles",
                emoji: "🎭",
              },
              {
                label: "Channels Configuration",
                description: "Configure Discord channels",
                value: "channels",
                emoji: "📢",
              },
              {
                label: "Categories Configuration",
                description: "Configure Discord categories",
                value: "categories",
                emoji: "📁",
              },
              {
                label: "Bot Settings",
                description: "Configure bot status and behavior",
                value: "bot",
                emoji: "🤖",
              },
              {
                label: "Warranty Settings",
                description: "Configure warranty parameters",
                value: "warranty",
                emoji: "🛡️",
              },
              {
                label: "Ticket Settings",
                description: "Configure ticket parameters",
                value: "tickets",
                emoji: "🎫",
              },
            ]);

          const actionRow = new ActionRowBuilder().addComponents(mainMenu);

          await interaction.editReply({
            embeds: [mainEmbed],
            components: [actionRow],
          });
          return;
        }

        // Analyser la sélection
        const [category, fieldKey] = selectedValue.split("_", 2);
        const categoryConfig = configCategories[category];
        const field = categoryConfig.fields[fieldKey];

        if (!field) {
          await interaction.followUp({
            content: "Field not found!",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Créer et afficher le modal pour la modification
        await showConfigModal(
          interaction,
          category,
          fieldKey,
          field,
          config[fieldKey],
        );
      }
    } catch (error) {
      console.error(
        "Erreur lors du traitement du menu de configuration:",
        error,
      );
      await interaction.followUp({
        content: "An error occurred while processing the configuration menu.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

/**
 * Affiche un modal pour modifier une configuration
 */
async function showConfigModal(
  interaction,
  category,
  fieldKey,
  field,
  currentValue,
) {
  const modal = new ModalBuilder()
    .setCustomId(`config_modal_${category}_${fieldKey}`)
    .setTitle(`Configure ${field.name}`);

  let placeholder = "";
  let maxLength = 100;

  // Personnaliser le placeholder selon le type
  switch (field.type) {
    case "role":
      placeholder = "Enter role ID (right-click role → Copy ID)";
      maxLength = 20;
      break;
    case "channel":
      placeholder = "Enter channel ID (right-click channel → Copy ID)";
      maxLength = 20;
      break;
    case "category":
      placeholder = "Enter category ID (right-click category → Copy ID)";
      maxLength = 20;
      break;
    case "number":
      placeholder = `Enter a number${field.min ? ` (${field.min}-${field.max || "unlimited"})` : ""}`;
      maxLength = 10;
      break;
    case "text":
      placeholder = "Enter text value";
      maxLength = 100;
      break;
    case "select":
      placeholder = `Enter one of: ${field.options.join(", ")}`;
      maxLength = 50;
      break;
  }

  const input = new TextInputBuilder()
    .setCustomId("config_value")
    .setLabel(field.name)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(placeholder)
    .setRequired(true)
    .setMaxLength(maxLength);

  if (currentValue && currentValue !== "Not set") {
    input.setValue(currentValue.toString());
  }

  const actionRow = new ActionRowBuilder().addComponents(input);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

/**
 * Retourne l'emoji approprié pour un type de champ
 */
function getFieldEmoji(type) {
  const emojis = {
    role: "🎭",
    channel: "📢",
    category: "📁",
    text: "📝",
    number: "🔢",
    select: "📋",
  };
  return emojis[type] || "⚙️";
}
