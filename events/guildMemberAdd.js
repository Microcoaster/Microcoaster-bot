/**
 * Gestionnaire de l'événement "guildMemberAdd".
 *
 * Ce module est déclenché lorsqu'un utilisateur rejoint le serveur.
 * Il vérifie si l'utilisateur a des rôles de garantie à restaurer automatiquement.
 */

const { EmbedBuilder } = require("discord.js");
const WarrantyDAO = require("../dao/warrantyDAO");
const ConfigManager = require("../utils/configManager");

module.exports = {
  name: "guildMemberAdd",
  /**
   * Méthode exécutée lors du déclenchement de l'événement "guildMemberAdd".
   *
   * @param {GuildMember} member - Le membre qui a rejoint le serveur.
   */ async execute(member) {
    try {
      const user = member.user;
      const guild = member.guild;

      // Instancier le DAO
      const warrantyDAO = new WarrantyDAO();

      // Logger l'événement dans les statistiques
      if (member.client.statsLogger) {
        await member.client.statsLogger.logUserJoin(member);
      }

      // Vérifier si c'est le serveur configuré
      const configManager = ConfigManager.getInstance();
      const config = configManager.getConfig();
      if (guild.id !== config.guild_id) {
        console.log(
          `⚠️  Événement ignoré - ${user.tag} a rejoint un serveur non configuré: ${guild.name} (${guild.id})`,
        );
        return;
      }

      console.log(
        `👋  ${user.tag} a rejoint le serveur configuré ${guild.name}`,
      );

      // Assigner automatiquement le rôle membre à tous les nouveaux utilisateurs
      const memberRoleId = config.roles.member_role_id;
      if (memberRoleId && memberRoleId !== "YOUR_MEMBER_ROLE_ID") {
        const memberRole = guild.roles.cache.get(memberRoleId);
        if (memberRole && !member.roles.cache.has(memberRoleId)) {
          try {
            await member.roles.add(memberRole);
            console.log(
              `   ↳ Rôle membre assigné automatiquement à ${user.tag}`,
            );

            // Logger l'assignation du rôle membre
            const roleLogsChannelId = config.channels.role_logs_channel_id;
            if (
              roleLogsChannelId &&
              roleLogsChannelId !== "YOUR_ROLE_LOGS_CHANNEL_ID"
            ) {
              const logChannel = guild.channels.cache.get(roleLogsChannelId);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setColor("#0099ff")
                  .setTitle("🎭 Automatic Member Role Assignment")
                  .setDescription(
                    `Member role automatically assigned to new user`,
                  )
                  .addFields(
                    {
                      name: "👤 User",
                      value: `${user.tag} (<@${user.id}>)`,
                      inline: true,
                    },
                    {
                      name: "🎭 Role Assigned",
                      value: `${memberRole.name}`,
                      inline: true,
                    },
                    {
                      name: "🤖 Triggered By",
                      value: "Automatic on join",
                      inline: true,
                    },
                  )
                  .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
              }
            }
          } catch (error) {
            console.error(
              `Erreur lors de l'assignation du rôle membre à ${user.tag}:`,
              error,
            );
          }
        }
      }

      // Vérifier si l'utilisateur a une garantie active pour restaurer des rôles premium/warranty
      const warranty = await warrantyDAO.getUserWarranty(user.id);

      if (!warranty) {
        console.log(
          `   ↳ Aucune garantie trouvée pour ${user.tag} - rôle membre assigné uniquement`,
        );
        return;
      } // Récupérer la configuration des rôles
      const premiumRoleId = config.roles.premium_role_id;
      const warrantyRoleId = config.roles.warranty_role_id;

      let rolesRestored = [];

      // Restaurer le rôle Premium si l'utilisateur a un code lié
      if (premiumRoleId && warranty.has_premium) {
        const premiumRole = guild.roles.cache.get(premiumRoleId);
        if (premiumRole && !member.roles.cache.has(premiumRoleId)) {
          await member.roles.add(premiumRole);
          rolesRestored.push("🎖️ Premium");
          console.log(`   ↳ Rôle Premium restauré pour ${user.tag}`);
        }
      }

      // Restaurer le rôle de garantie si elle est active et non expirée
      if (warrantyRoleId && warranty.has_warranty) {
        const now = new Date();
        const expirationDate = new Date(warranty.warranty_expires_at);

        if (expirationDate > now) {
          const warrantyRole = guild.roles.cache.get(warrantyRoleId);
          if (warrantyRole && !member.roles.cache.has(warrantyRoleId)) {
            await member.roles.add(warrantyRole);
            rolesRestored.push("🛡️ Warranty");
            console.log(`   ↳ Rôle de garantie restauré pour ${user.tag}`);
          }
        } else {
          console.log(
            `   ↳ Garantie expirée pour ${user.tag}, rôle non restauré`,
          );
          // Mettre à jour le statut en base de données
          await warrantyDAO.updateRoleStatus(warranty.warranty_id, false);
        }
      }

      if (rolesRestored.length > 0) {
        // Logger la restauration automatique
        await warrantyDAO.logWarrantyAction({
          warranty_id: warranty.warranty_id,
          user_id: user.id,
          action_type: "ROLES_RESTORED",
          action_details: `Automatic role restoration on rejoin: ${rolesRestored.join(", ")}`,
          performed_by: member.client.user.id,
        });

        // Envoyer un message de bienvenue personnalisé avec notification de restauration
        try {
          const welcomeEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("🎉 Welcome Back to MicroCoaster™!")
            .setDescription(`Hello ${user}! Welcome back to our server.`)
            .addFields({
              name: "Restored Access",
              value: rolesRestored.join(", "),
              inline: false,
            });

          if (warranty.has_warranty && warranty.warranty_expires_at) {
            const expirationDate = new Date(warranty.warranty_expires_at);
            if (expirationDate > new Date()) {
              welcomeEmbed.addFields({
                name: "Warranty Status",
                value: `Active until <t:${Math.floor(expirationDate.getTime() / 1000)}:F>`,
                inline: false,
              });
            }
          }

          welcomeEmbed
            .setFooter({
              text: "Your premium access and warranty have been automatically restored!",
            })
            .setTimestamp();

          await user.send({ embeds: [welcomeEmbed] });
        } catch (dmError) {
          console.log(
            `Impossible d'envoyer un message de bienvenue à ${user.tag}: ${dmError.message}`,
          );
        }

        console.log(
          `✅  Rôles restaurés automatiquement pour ${user.tag}: ${rolesRestored.join(", ")}`,
        );
      } else {
        console.log(`   ↳ Aucun rôle à restaurer pour ${user.tag}`);
      }
    } catch (error) {
      console.error(
        `Erreur lors de la restauration des rôles pour ${member.user.tag}:`,
        error,
      );
    }
  },
};
