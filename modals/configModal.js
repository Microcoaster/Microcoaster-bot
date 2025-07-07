const { EmbedBuilder, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  execute: async (interaction) => {
    // Vérifier si c'est un modal de configuration
    if (!interaction.customId.startsWith("config_modal_")) {
      return;
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Analyser l'ID du modal
      const [, , category, fieldKey] = interaction.customId.split("_");
      const newValue = interaction.fields
        .getTextInputValue("config_value")
        .trim();

      // Charger la configuration actuelle
      const configPath = path.join(__dirname, "../config/config.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

      // Valider et formater la nouvelle valeur
      const validationResult = await validateConfigValue(
        interaction,
        fieldKey,
        newValue,
        category,
      );

      if (!validationResult.valid) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Invalid Value")
          .setDescription(validationResult.error)
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Sauvegarder l'ancienne valeur pour le log
      const oldValue = getNestedConfigValue(config, category, fieldKey);

      // Mettre à jour la configuration
      setNestedConfigValue(config, category, fieldKey, validationResult.value);

      // Sauvegarder le fichier de configuration
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Appliquer les changements en temps réel si nécessaire
      await applyConfigChanges(
        interaction.client,
        fieldKey,
        validationResult.value,
      );

      // Créer l'embed de confirmation
      const successEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("✅ Configuration Updated")
        .setDescription(
          `Successfully updated **${getFieldDisplayName(fieldKey)}**`,
        )
        .addFields(
          {
            name: "Previous Value",
            value: formatConfigValue(oldValue, fieldKey, interaction.guild),
            inline: true,
          },
          {
            name: "New Value",
            value: formatConfigValue(
              validationResult.value,
              fieldKey,
              interaction.guild,
            ),
            inline: true,
          },
          {
            name: "Updated By",
            value: `${interaction.user.tag}`,
            inline: true,
          },
        )
        .setFooter({ text: "Configuration saved successfully" })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      // Logger la modification dans le canal de logs si configuré
      await logConfigChange(
        interaction.client,
        config,
        category,
        fieldKey,
        oldValue,
        validationResult.value,
        interaction.user,
      );
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la configuration:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Error")
        .setDescription(
          "An error occurred while saving the configuration. Please try again.",
        )
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  },
};

/**
 * Valide une valeur de configuration
 */
async function validateConfigValue(interaction, fieldKey, value) {
  const fieldTypes = {
    // Roles
    premium_role_id: "role",
    warranty_role_id: "role",
    admin_role_id: "role",
    support_team_role_id: "role",
    technical_team_role_id: "role",
    business_team_role_id: "role",
    recruitment_team_role_id: "role",

    // Channels
    warranty_activation_channel_id: "channel",
    support_channel_id: "channel",
    logs_moderation_channel_id: "channel",
    bot_stats_channel_id: "channel",
    role_logs_channel_id: "channel",

    // Categories
    technical_category_id: "category",
    product_category_id: "category",
    business_category_id: "category",
    recruitment_category_id: "category",

    // Bot settings
    bot_prefix: "text",
    bot_status: "text",
    bot_activity_type: "select",

    // Warranty settings
    default_warranty_duration_months: "number",
    max_activation_attempts: "number",
    cleanup_interval_hours: "number",

    // Ticket settings
    ticket_auto_close_after_hours: "number",
    max_tickets_per_user: "number",
    default_ticket_priority: "select",
  };

  const fieldType = fieldTypes[fieldKey];

  switch (fieldType) {
    case "role": {
      const role = interaction.guild.roles.cache.get(value);
      if (!role) {
        return {
          valid: false,
          error: `Role with ID \`${value}\` not found in this server.`,
        };
      }
      return { valid: true, value: value };
    }

    case "channel": {
      const channel = interaction.guild.channels.cache.get(value);
      if (!channel) {
        return {
          valid: false,
          error: `Channel with ID \`${value}\` not found in this server.`,
        };
      }
      return { valid: true, value: value };
    }

    case "category": {
      const category = interaction.guild.channels.cache.get(value);
      if (!category || category.type !== 4) {
        // 4 = CategoryChannel
        return {
          valid: false,
          error: `Category with ID \`${value}\` not found in this server.`,
        };
      }
      return { valid: true, value: value };
    }

    case "number": {
      const num = parseInt(value);
      if (isNaN(num) || num < 1) {
        return { valid: false, error: "Please enter a valid positive number." };
      }

      // Validation spécifique selon le champ
      if (
        fieldKey === "default_warranty_duration_months" &&
        (num < 1 || num > 120)
      ) {
        return {
          valid: false,
          error: "Warranty duration must be between 1 and 120 months.",
        };
      }
      if (fieldKey === "max_activation_attempts" && (num < 1 || num > 10)) {
        return {
          valid: false,
          error: "Max activation attempts must be between 1 and 10.",
        };
      }
      if (fieldKey === "cleanup_interval_hours" && (num < 1 || num > 168)) {
        return {
          valid: false,
          error: "Cleanup interval must be between 1 and 168 hours (1 week).",
        };
      }
      if (
        fieldKey === "ticket_auto_close_after_hours" &&
        (num < 1 || num > 720)
      ) {
        return {
          valid: false,
          error: "Auto close time must be between 1 and 720 hours (30 days).",
        };
      }
      if (fieldKey === "max_tickets_per_user" && (num < 1 || num > 10)) {
        return {
          valid: false,
          error: "Max tickets per user must be between 1 and 10.",
        };
      }

      return { valid: true, value: num };
    }

    case "text":
      if (value.length === 0) {
        return { valid: false, error: "Text value cannot be empty." };
      }
      if (value.length > 100) {
        return {
          valid: false,
          error: "Text value must be less than 100 characters.",
        };
      }
      return { valid: true, value: value };

    case "select": {
      const validOptions = {
        bot_activity_type: ["PLAYING", "WATCHING", "LISTENING", "STREAMING"],
        default_ticket_priority: ["low", "medium", "high", "urgent"],
      };

      const options = validOptions[fieldKey];
      if (options && !options.includes(value)) {
        return {
          valid: false,
          error: `Value must be one of: ${options.join(", ")}`,
        };
      }

      return { valid: true, value: value };
    }

    default:
      return { valid: true, value: value };
  }
}

/**
 * Applique les changements de configuration en temps réel
 */
async function applyConfigChanges(client, fieldKey, newValue) {
  try {
    switch (fieldKey) {
      case "bot_status":
        await client.user.setActivity(newValue, { type: "WATCHING" });
        break;

      case "bot_activity_type": {
        const config = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, "../config/config.json"),
            "utf8",
          ),
        );
        await client.user.setActivity(
          config.bot_status || "MicroCoaster™ Support",
          { type: newValue },
        );
        break;
      }
    }
  } catch (error) {
    console.error(
      "Erreur lors de l'application des changements de configuration:",
      error,
    );
  }
}

/**
 * Formate une valeur de configuration pour l'affichage
 */
function formatConfigValue(value, fieldKey, guild) {
  if (!value || value === "Not set") return "Not set";

  const fieldTypes = {
    premium_role_id: "role",
    warranty_role_id: "role",
    admin_role_id: "role",
    support_team_role_id: "role",
    technical_team_role_id: "role",
    business_team_role_id: "role",
    recruitment_team_role_id: "role",
    warranty_activation_channel_id: "channel",
    support_channel_id: "channel",
    logs_moderation_channel_id: "channel",
    bot_stats_channel_id: "channel",
    role_logs_channel_id: "channel",
    technical_category_id: "category",
    product_category_id: "category",
    business_category_id: "category",
    recruitment_category_id: "category",
  };

  const fieldType = fieldTypes[fieldKey];

  switch (fieldType) {
    case "role": {
      const role = guild.roles.cache.get(value);
      return role
        ? `${role.name} (\`${role.id}\`)`
        : `Unknown Role (\`${value}\`)`;
    }

    case "channel": {
      const channel = guild.channels.cache.get(value);
      return channel
        ? `${channel.name} (\`${channel.id}\`)`
        : `Unknown Channel (\`${value}\`)`;
    }

    case "category": {
      const category = guild.channels.cache.get(value);
      return category
        ? `${category.name} (\`${category.id}\`)`
        : `Unknown Category (\`${value}\`)`;
    }

    default:
      return `\`${value}\``;
  }
}

/**
 * Obtient le nom d'affichage d'un champ
 */
function getFieldDisplayName(fieldKey) {
  const displayNames = {
    premium_role_id: "Premium Role",
    warranty_role_id: "Warranty Role",
    admin_role_id: "Admin Role",
    support_team_role_id: "Support Team Role",
    technical_team_role_id: "Technical Team Role",
    business_team_role_id: "Business Team Role",
    recruitment_team_role_id: "Recruitment Team Role",
    warranty_activation_channel_id: "Warranty Activation Channel",
    support_channel_id: "Support Channel",
    logs_moderation_channel_id: "Moderation Logs Channel",
    bot_stats_channel_id: "Bot Stats Channel",
    role_logs_channel_id: "Role Logs Channel",
    technical_category_id: "Technical Category",
    product_category_id: "Product Category",
    business_category_id: "Business Category",
    recruitment_category_id: "Recruitment Category",
    bot_prefix: "Bot Prefix",
    bot_status: "Bot Status",
    bot_activity_type: "Bot Activity Type",
    default_warranty_duration_months: "Default Warranty Duration",
    max_activation_attempts: "Max Activation Attempts",
    cleanup_interval_hours: "Cleanup Interval",
    ticket_auto_close_after_hours: "Ticket Auto Close Time",
    max_tickets_per_user: "Max Tickets Per User",
    default_ticket_priority: "Default Ticket Priority",
  };

  return displayNames[fieldKey] || fieldKey;
}

/**
 * Enregistre le changement de configuration dans les logs
 */
async function logConfigChange(
  client,
  config,
  category,
  fieldKey,
  oldValue,
  newValue,
  user,
) {
  try {
    const statsChannelId = config.channels
      ? config.channels.bot_stats_channel_id
      : config.bot_stats_channel_id;
    if (!statsChannelId) return;

    const logChannel = client.channels.cache.get(statsChannelId);
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
      .setColor("#ffa500")
      .setTitle("⚙️ Configuration Changed")
      .addFields(
        { name: "Setting", value: getFieldDisplayName(fieldKey), inline: true },
        { name: "Changed By", value: `${user.tag}`, inline: true },
        {
          name: "Previous Value",
          value: formatConfigValue(oldValue, fieldKey, logChannel.guild),
          inline: false,
        },
        {
          name: "New Value",
          value: formatConfigValue(newValue, fieldKey, logChannel.guild),
          inline: false,
        },
      )
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
  } catch (error) {
    console.error(
      "Erreur lors de l'enregistrement du log de configuration:",
      error,
    );
  }
}

/**
 * Récupère une valeur de configuration imbriquée
 */
function getNestedConfigValue(config, category, fieldKey) {
  if (
    category &&
    config[category] &&
    config[category][fieldKey] !== undefined
  ) {
    return config[category][fieldKey];
  }
  return config[fieldKey]; // Fallback pour guild_id
}

/**
 * Définit une valeur de configuration imbriquée
 */
function setNestedConfigValue(config, category, fieldKey, value) {
  if (category && config[category]) {
    config[category][fieldKey] = value;
  } else {
    config[fieldKey] = value; // Fallback pour guild_id
  }
}
