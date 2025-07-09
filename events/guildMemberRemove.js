/**
 * Gestionnaire de l'événement "guildMemberRemove".
 *
 * Ce module est déclenché lorsqu'un utilisateur quitte le serveur.
 * Il sauvegarde les informations des rôles avant le départ pour une restauration future.
 */

const WarrantyDAO = require("../dao/warrantyDAO");

module.exports = {
  name: "guildMemberRemove",
  /**
   * Méthode exécutée lors du déclenchement de l'événement "guildMemberRemove".
   *
   * @param {GuildMember} member - Le membre qui a quitté le serveur.
   */
  async execute(member) {
    try {
      const user = member.user;
      const guild = member.guild;

      // Créer une instance de WarrantyDAO
      const warrantyDAO = new WarrantyDAO();

      // Vérifier si c'est le serveur configuré
      const ConfigManager = require("../utils/configManager");
      const config = ConfigManager.getInstance().getConfig();
      if (guild.id !== config.guild_id) {
        console.log(
          `⚠️  Événement ignoré - ${user.tag} a quitté un serveur non configuré: ${guild.name} (${guild.id})`,
        );
        return;
      }

      console.log(
        `👋  ${user.tag} a quitté le serveur configuré ${guild.name}`,
      );

      // Récupérer la configuration des rôles
      const premiumRoleId = config.roles.premium_role_id;
      const warrantyRoleId = config.roles.warranty_role_id;

      // Vérifier si l'utilisateur avait des rôles de garantie/premium
      const hadPremium = member.roles.cache.has(premiumRoleId);
      const hadWarranty = member.roles.cache.has(warrantyRoleId);

      if (hadPremium || hadWarranty) {
        // Vérifier si l'utilisateur a une garantie existante
        const existingWarranty = await warrantyDAO.getUserWarranty(user.id);

        if (existingWarranty) {
          // Mettre à jour les informations de rôles dans la sauvegarde
          await warrantyDAO.updateUserRoleStatus({
            user_id: user.id,
            has_premium: hadPremium,
            has_warranty: hadWarranty,
            code_linked: existingWarranty.code_linked,
            warranty_expires_at: existingWarranty.warranty_expires_at,
          });

          // Logger le départ avec sauvegarde des rôles - utiliser le code_id depuis la garantie
          try {
            await warrantyDAO.logWarrantyAction({
              user_id: user.id,
              admin_id: member.client.user.id,
              code_id: existingWarranty.warranty_id, // C'est en fait le code_id
              action_type: "USER_LEFT",
              action_details: `User left server with roles: ${[hadPremium ? "Premium" : "", hadWarranty ? "Warranty" : ""].filter(Boolean).join(", ")}`,
              performed_by: member.client.user.id,
            });
          } catch (logError) {
            console.log(
              `⚠️ Impossible de logger l'action de départ pour ${user.tag}: ${logError.message}`,
            );
          }

          console.log(
            `   ↳ Rôles sauvegardés pour ${user.tag}: ${[hadPremium ? "Premium" : "", hadWarranty ? "Warranty" : ""].filter(Boolean).join(", ")}`,
          );
        } else if (hadPremium || hadWarranty) {
          // L'utilisateur avait des rôles mais pas d'entrée dans la base de données
          // Créer une sauvegarde basique
          await warrantyDAO.createRoleBackup({
            user_id: user.id,
            has_premium: hadPremium,
            has_warranty: hadWarranty,
            code_linked: false,
            warranty_expires_at: null,
          });

          console.log(
            `   ↳ Sauvegarde de base créée pour ${user.tag} (rôles sans garantie en base)`,
          );
        }
      } else {
        console.log(
          `   ↳ ${user.tag} n'avait aucun rôle spécial à sauvegarder`,
        );
      }
    } catch (error) {
      console.error(
        `Erreur lors de la sauvegarde des rôles pour ${member.user.tag}:`,
        error,
      );
    }
  },
};
