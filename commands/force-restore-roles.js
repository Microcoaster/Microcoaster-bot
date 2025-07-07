const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const WarrantyDAO = require("../dao/warrantyDAO");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("force-restore-roles")
    .setDescription("Force restore warranty roles for user(s)")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user whose roles to restore (leave empty for all users)")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("user");
      const warrantyDAO = new WarrantyDAO();

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Si aucun utilisateur spécifié, traiter tous les utilisateurs avec garantie active
      if (!targetUser) {
        return await this.processAllUsers(interaction, warrantyDAO);
      }

      // Traiter un utilisateur spécifique
      return await this.processSingleUser(interaction, warrantyDAO, targetUser);
    } catch (error) {
      console.error("Erreur lors de la restauration forcée des rôles:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Error")
        .setDescription(
          "An error occurred while restoring roles. Please try again.",
        )
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  },

  async processSingleUser(interaction, warrantyDAO, targetUser) {
    const member = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!member) {
      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ User Not Found")
        .setDescription(`${targetUser.tag} is not a member of this server.`)
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    // Vérifier si l'utilisateur a une garantie active
    const warranty = await warrantyDAO.getUserWarranty(targetUser.id);

    if (!warranty) {
      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ No Active Warranty")
        .setDescription(`${targetUser.tag} does not have an active warranty.`)
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    // Vérifier si la garantie n'a pas expiré
    const now = new Date();
    const expirationDate = new Date(warranty.expiration_date);

    if (expirationDate <= now) {
      const embed = new EmbedBuilder()
        .setColor("#ff9900")
        .setTitle("⚠️ Warranty Expired")
        .setDescription(
          `${targetUser.tag}'s warranty expired on <t:${Math.floor(expirationDate.getTime() / 1000)}:F>. Cannot restore roles for expired warranty.`,
        )
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const result = await this.restoreUserRoles(interaction, warrantyDAO, member, warranty);
    return await interaction.editReply({ embeds: [result.embed] });
  },

  async processAllUsers(interaction, warrantyDAO) {
    // Récupérer toutes les garanties actives
    const activeWarranties = await warrantyDAO.getActiveWarranties(interaction.guild.id);

    if (activeWarranties.length === 0) {
      const embed = new EmbedBuilder()
        .setColor("#ffff00")
        .setTitle("ℹ️ No Active Warranties")
        .setDescription("No users with active warranties found.")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    let processedCount = 0;
    let restoredCount = 0;
    let errorCount = 0;
    const results = [];

    for (const warranty of activeWarranties) {
      try {
        const member = await interaction.guild.members
          .fetch(warranty.user_id)
          .catch(() => null);

        if (!member) {
          errorCount++;
          continue;
        }

        processedCount++;
        const result = await this.restoreUserRoles(interaction, warrantyDAO, member, warranty, true);
        
        if (result.restored) {
          restoredCount++;
          results.push(`✅ ${member.user.tag}: ${result.rolesRestored.join(", ")}`);
        } else {
          results.push(`ℹ️ ${member.user.tag}: Already has all roles`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing user ${warranty.user_id}:`, error);
      }
    }

    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("🔄 Bulk Role Restoration Complete")
      .setDescription(
        `Processed ${processedCount} users with active warranties.`
      )
      .addFields(
        {
          name: "📊 Summary",
          value: `**Roles Restored:** ${restoredCount}\n**Already Up-to-Date:** ${processedCount - restoredCount}\n**Errors:** ${errorCount}`,
          inline: false,
        }
      )
      .setTimestamp();

    if (results.length > 0) {
      const resultText = results.slice(0, 10).join('\n');
      embed.addFields({
        name: "📋 Results (showing first 10)",
        value: resultText.length > 1024 ? resultText.substring(0, 1021) + "..." : resultText,
        inline: false,
      });
    }

    return await interaction.editReply({ embeds: [embed] });
  },

  async restoreUserRoles(interaction, warrantyDAO, member, warranty, isBulk = false) {
    // Récupérer les rôles de garantie depuis la configuration
    const config = require("../config/config.json");
    const warrantyRoleId = config.roles.warranty_role_id;
    const premiumRoleId = config.roles.premium_role_id;

    if (!warrantyRoleId || !premiumRoleId) {
      throw new Error("Warranty roles are not properly configured");
    }

    const warrantyRole = interaction.guild.roles.cache.get(warrantyRoleId);
    const premiumRole = interaction.guild.roles.cache.get(premiumRoleId);

    if (!warrantyRole || !premiumRole) {
      throw new Error("One or more warranty roles could not be found");
    }

    // Restaurer les rôles
    const rolesToAdd = [];
    const rolesRestored = [];

    if (!member.roles.cache.has(warrantyRoleId)) {
      rolesToAdd.push(warrantyRole);
      rolesRestored.push(warrantyRole.name);
    }

    if (!member.roles.cache.has(premiumRoleId)) {
      rolesToAdd.push(premiumRole);
      rolesRestored.push(premiumRole.name);
    }

    const expirationDate = new Date(warranty.warranty_expires_at || warranty.expiration_date);

    if (rolesToAdd.length === 0) {
      const embed = new EmbedBuilder()
        .setColor("#ffff00")
        .setTitle("ℹ️ No Action Needed")
        .setDescription(`${member.user.tag} already has all warranty roles.`)
        .addFields(
          {
            name: "Current Roles",
            value: `${warrantyRole.name}, ${premiumRole.name}`,
            inline: false,
          },
          {
            name: "Warranty Expiration",
            value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`,
            inline: false,
          },
        )
        .setTimestamp();

      return { embed, restored: false, rolesRestored: [] };
    }

    await member.roles.add(rolesToAdd);

    // Mettre à jour le statut des rôles dans la base de données
    await warrantyDAO.updateRoleStatus(warranty.warranty_id || warranty.id, true);

    // Logger l'action
    await warrantyDAO.logWarrantyAction({
      warranty_id: warranty.warranty_id || warranty.id,
      user_id: member.user.id,
      action_type: isBulk ? "BULK_ROLES_RESTORED" : "ROLES_RESTORED",
      action_details: `Force restored roles: ${rolesRestored.join(", ")}`,
      performed_by: interaction.user.id,
    });

    // Créer l'embed de succès
    const successEmbed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("✅ Roles Restored Successfully")
      .setDescription(
        `Warranty roles have been restored for ${member.user.tag}.`,
      )
      .addFields(
        {
          name: "User",
          value: `${member.user.tag} (${member.user.id})`,
          inline: true,
        },
        {
          name: "Restored Roles",
          value: rolesRestored.join(", "),
          inline: true,
        },
        {
          name: "Warranty Expiration",
          value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`,
          inline: false,
        },
        {
          name: "Restored by",
          value: `${interaction.user.tag}`,
          inline: true,
        },
      )
      .setTimestamp();

    // Envoyer un DM à l'utilisateur (seulement pour les restaurations individuelles)
    if (!isBulk) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("🔄 Warranty Roles Restored")
          .setDescription(
            "Your MicroCoaster™ warranty roles have been restored by our support team.",
          )
          .addFields(
            {
              name: "Restored Access",
              value: rolesRestored.join(", "),
              inline: false,
            },
            {
              name: "Warranty Valid Until",
              value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`,
              inline: false,
            },
          )
          .setFooter({ text: "Thank you for choosing MicroCoaster™!" })
          .setTimestamp();

        await member.user.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.log(
          `Impossible d'envoyer un DM à ${member.user.tag}: ${dmError.message}`,
        );
      }
    }

    return { embed: successEmbed, restored: true, rolesRestored };
  }
};
