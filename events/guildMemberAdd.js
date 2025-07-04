/**
 * Gestionnaire de l'événement "guildMemberAdd".
 *
 * Ce module est déclenché lorsqu'un utilisateur rejoint le serveur.
 * Il vérifie si l'utilisateur a des rôles de garantie à restaurer automatiquement.
 */

const { EmbedBuilder } = require('discord.js');
const warrantyDAO = require('../dao/warrantyDAO');

module.exports = {
  name: "guildMemberAdd",
  /**
   * Méthode exécutée lors du déclenchement de l'événement "guildMemberAdd".
   *
   * @param {GuildMember} member - Le membre qui a rejoint le serveur.
   */
  async execute(member) {
    try {
      const user = member.user;
      const guild = member.guild;
      
      console.log(`👋  ${user.tag} a rejoint le serveur ${guild.name}`);

      // Vérifier si l'utilisateur a une garantie active
      const warranty = await warrantyDAO.getUserWarranty(user.id, guild.id);
      
      if (!warranty) {
        console.log(`   ↳ Aucune garantie trouvée pour ${user.tag}`);
        return;
      }

      // Récupérer la configuration des rôles
      const config = require('../config/config.json');
      const premiumRoleId = config.roles.premium_role_id;
      const warrantyRoleId = config.roles.warranty_role_id;

      let rolesRestored = [];
      
      // Restaurer le rôle Premium si l'utilisateur a un code lié
      if (premiumRoleId && warranty.has_premium) {
        const premiumRole = guild.roles.cache.get(premiumRoleId);
        if (premiumRole && !member.roles.cache.has(premiumRoleId)) {
          await member.roles.add(premiumRole);
          rolesRestored.push('🎖️ Premium');
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
            rolesRestored.push('🛡️ Warranty');
            console.log(`   ↳ Rôle de garantie restauré pour ${user.tag}`);
          }
        } else {
          console.log(`   ↳ Garantie expirée pour ${user.tag}, rôle non restauré`);
          // Mettre à jour le statut en base de données
          await warrantyDAO.updateRoleStatus(warranty.warranty_id, false);
        }
      }

      if (rolesRestored.length > 0) {
        // Logger la restauration automatique
        await warrantyDAO.logWarrantyAction({
          warranty_id: warranty.warranty_id,
          user_id: user.id,
          guild_id: guild.id,
          action_type: 'ROLES_RESTORED',
          action_details: `Automatic role restoration on rejoin: ${rolesRestored.join(', ')}`,
          performed_by: member.client.user.id
        });

        // Envoyer un message de bienvenue personnalisé avec notification de restauration
        try {
          const welcomeEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎉 Welcome Back to MicroCoaster™!')
            .setDescription(`Hello ${user}! Welcome back to our server.`)
            .addFields(
              { name: 'Restored Access', value: rolesRestored.join(', '), inline: false }
            );

          if (warranty.has_warranty && warranty.warranty_expires_at) {
            const expirationDate = new Date(warranty.warranty_expires_at);
            if (expirationDate > new Date()) {
              welcomeEmbed.addFields(
                { name: 'Warranty Status', value: `Active until <t:${Math.floor(expirationDate.getTime() / 1000)}:F>`, inline: false }
              );
            }
          }

          welcomeEmbed
            .setFooter({ text: 'Your premium access and warranty have been automatically restored!' })
            .setTimestamp();

          await user.send({ embeds: [welcomeEmbed] });
        } catch (dmError) {
          console.log(`Impossible d'envoyer un message de bienvenue à ${user.tag}: ${dmError.message}`);
        }

        console.log(`✅  Rôles restaurés automatiquement pour ${user.tag}: ${rolesRestored.join(', ')}`);
      } else {
        console.log(`   ↳ Aucun rôle à restaurer pour ${user.tag}`);
      }

    } catch (error) {
      console.error(`Erreur lors de la restauration des rôles pour ${member.user.tag}:`, error);
    }
  }
};
