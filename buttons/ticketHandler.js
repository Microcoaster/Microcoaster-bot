const {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const TicketDAO = require("../dao/ticketDAO");
const ticketDAO = new TicketDAO();

// Configuration des types de tickets
const TICKET_TYPES = {
  ticket_technical: {
    name: "Technical Support",
    emoji: "🛠️",
    color: "#3498db",
    description: "Technical support and troubleshooting",
    configKey: "technical_category_id",
    roleKey: "technical_team_role_id",
  },
  ticket_product: {
    name: "Product Support",
    emoji: "🔧",
    color: "#2ecc71",
    description: "Product information and general support",
    configKey: "product_category_id",
    roleKey: "support_team_role_id",
  },
  ticket_business: {
    name: "Business Inquiry",
    emoji: "💼",
    color: "#95a5a6",
    description: "Business partnerships and bulk orders",
    configKey: "business_category_id",
    roleKey: "business_team_role_id",
  },
  ticket_recruitment: {
    name: "Join Our Team",
    emoji: "👥",
    color: "#e74c3c",
    description: "Team recruitment and opportunities",
    configKey: "recruitment_category_id",
    roleKey: "recruitment_team_role_id",
  },
};

/**
 * Handler principal pour tous les boutons de tickets
 * Le type de ticket est automatiquement détecté depuis interaction.customId
 */
module.exports = {
  execute: async (interaction, params = []) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Le type de ticket peut être passé en paramètre ou déduit du customId
      const ticketType = params.length > 0 ? params[0] : interaction.customId;
      const user = interaction.user;
      const guild = interaction.guild;
      const ticketConfig = TICKET_TYPES[ticketType];

      console.log(
        `\x1b[38;5;4m🎫 Création ticket ${ticketType} pour ${user.username} (${user.id})\x1b[0m`,
      );

      if (!ticketConfig) {
        console.error(
          `\x1b[38;5;1m❌ Type de ticket invalide: ${ticketType}\x1b[0m`,
        );
        const embed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Invalid Ticket Type")
          .setDescription(`Unknown ticket type: ${ticketType}`)
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Vérifier si l'utilisateur a déjà un ticket ouvert de ce type
      const existingTicket = await ticketDAO.getUserActiveTicket(
        user.id,
        guild.id,
        ticketType,
      );

      if (existingTicket) {
        console.log(
          `\x1b[38;5;3m⚠️ Ticket existant trouvé pour ${user.username}: ${existingTicket.ticket_id}\x1b[0m`,
        );
        const channel = guild.channels.cache.get(existingTicket.channel_id);
        const embed = new EmbedBuilder()
          .setColor("#ff9900")
          .setTitle("⚠️ Ticket Already Exists")
          .setDescription(
            `You already have an active ${ticketConfig.name.toLowerCase()} ticket.`,
          )
          .addFields({
            name: "Existing Ticket",
            value: channel
              ? `${channel}`
              : `ticket-${existingTicket.ticket_number}`,
            inline: false,
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Récupérer le prochain numéro de ticket (sans guild.id car la méthode ne le prend pas)
      const ticketNumber = await ticketDAO.getNextTicketNumber();

      // Récupérer la configuration
      const config = require("../config/config.json");
      const categoryId = config.categories[ticketConfig.configKey];
      let category = null;

      if (categoryId) {
        category = guild.channels.cache.get(categoryId);
      }

      // Créer le nom du canal
      const channelName =
        `${ticketConfig.emoji}-${ticketNumber}-${user.username}`.toLowerCase();

      // Créer le canal de ticket
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          },
        ],
      });

      // Ajouter les permissions pour les rôles staff si configurés
      const staffRoles = [
        config.roles.support_team_role_id,
        config.roles[ticketConfig.roleKey],
      ].filter((roleId) => roleId && guild.roles.cache.has(roleId));

      for (const roleId of staffRoles) {
        await ticketChannel.permissionOverwrites.create(roleId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          ManageMessages: true,
        });
      }

      // Enregistrer le ticket dans la base de données
      await ticketDAO.createTicket(
        user.id,
        ticketChannel.id,
        ticketType,
        "medium",
        ticketNumber,
      );

      // Créer l'embed de bienvenue
      const welcomeEmbed = new EmbedBuilder()
        .setColor(ticketConfig.color)
        .setTitle(
          `${ticketConfig.emoji} ${ticketConfig.name} Ticket #${ticketNumber}`,
        )
        .setDescription(
          `Hello ${user}! Thank you for creating a ${ticketConfig.name.toLowerCase()} ticket.

**What happens next?**
🔹 Our ${ticketConfig.name.toLowerCase()} team will respond as soon as possible
🔹 Please describe your issue or question in detail
🔹 You can attach files, screenshots, or additional information

**Need immediate help?**
- Check our FAQ and documentation first
- Provide as much detail as possible about your issue

*This ticket will be handled by our support team shortly.*`,
        )
        .addFields(
          {
            name: "Ticket Type",
            value: ticketConfig.description,
            inline: true,
          },
          { name: "Ticket Number", value: `#${ticketNumber}`, inline: true },
          { name: "Status", value: "🟢 Open", inline: true },
        )
        .setThumbnail(
          "https://ptero.yamakajump-crew.fr/extensions/resourcemanager/uploads/1751636055_logo.png",
        )
        .setFooter({
          text: "MicroCoaster™ Support • Please be patient, we'll help you soon!",
          iconURL:
            "https://ptero.yamakajump-crew.fr/extensions/resourcemanager/uploads/1751636055_logo.png",
        })
        .setTimestamp();

      await ticketChannel.send({ content: `${user}`, embeds: [welcomeEmbed] });

      // Créer les boutons de gestion de ticket pour le staff
      const ticketManagementButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_priority:${ticketChannel.id}`)
          .setLabel("Mark as Priority")
          .setEmoji("📌")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`ticket_assign:${ticketChannel.id}`)
          .setLabel("Assign to Member")
          .setEmoji("👤")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`ticket_close:${ticketChannel.id}`)
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger),
      );

      // Envoyer le message de gestion de ticket (visible seulement par le staff)
      const managementEmbed = new EmbedBuilder()
        .setColor("#2c2f33")
        .setTitle("🛠️ Ticket Management")
        .setDescription("Staff tools for managing this ticket:")
        .addFields(
          {
            name: "📌 Priority",
            value: "Set priority level for this ticket",
            inline: true,
          },
          {
            name: "👤 Assign",
            value: "Assign this ticket to a staff member",
            inline: true,
          },
          {
            name: "🔒 Close",
            value: "Close this ticket when resolved",
            inline: false,
          },
        )
        .setFooter({ text: "Only staff members can use these controls" })
        .setTimestamp();

      await ticketChannel.send({
        embeds: [managementEmbed],
        components: [ticketManagementButtons],
      });

      // Ping l'équipe appropriée selon le type de ticket
      const teamRoleId =
        config.roles[ticketConfig.roleKey] || config.roles.support_team_role_id;
      if (teamRoleId) {
        const role = guild.roles.cache.get(teamRoleId);
        if (role) {
          await ticketChannel.send({
            content: `${role} New ${ticketConfig.name.toLowerCase()} ticket opened!`,
            allowedMentions: { roles: [teamRoleId] },
          });
        }
      }

      // Confirmer la création du ticket à l'utilisateur
      const confirmEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("✅ Ticket Created Successfully")
        .setDescription(
          `Your ${ticketConfig.name.toLowerCase()} ticket has been created!`,
        )
        .addFields(
          { name: "Ticket Channel", value: `${ticketChannel}`, inline: true },
          { name: "Ticket Number", value: `#${ticketNumber}`, inline: true },
          { name: "Type", value: ticketConfig.name, inline: true },
        )
        .setThumbnail(
          "https://ptero.yamakajump-crew.fr/extensions/resourcemanager/uploads/1751636055_logo.png",
        )
        .setFooter({
          text: "You can now describe your issue in the ticket channel.",
          iconURL:
            "https://ptero.yamakajump-crew.fr/extensions/resourcemanager/uploads/1751636055_logo.png",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [confirmEmbed] });
    } catch (error) {
      console.error(`Erreur lors de la création du ticket:`, error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Error Creating Ticket")
        .setDescription(
          "An error occurred while creating your ticket. Please try again or contact an administrator.",
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
