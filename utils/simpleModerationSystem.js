/**
 * Système de modération simplifié pour MicroCoaster™
 * Gère uniquement la détection et suppression des liens Discord
 */

class SimpleModerationSystem {
  constructor(client) {
    this.client = client;
    console.log(
      "🛡️ Système de modération initialisé (détection liens Discord uniquement)",
    );
  }

  /**
   * Vérifier si le message contient des liens Discord
   */
  hasDiscordLinks(content) {
    const discordPatterns = [
      /discord\.gg\/[\w-]+/gi,
      /discordapp\.com\/invite\/[\w-]+/gi,
      /discord\.com\/invite\/[\w-]+/gi,
      /dsc\.gg\/[\w-]+/gi,
    ];

    return discordPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Vérifier si l'utilisateur est staff (exempté)
   */
  isStaffMember(member) {
    if (!member) return false;

    try {
      const ConfigManager = require("./configManager");
      const config = ConfigManager.getInstance().getConfig();

      // Rôles staff exemptés
      const staffRoles = [
        config.roles?.admin_role_id,
        config.roles?.support_team_role_id,
        config.roles?.technical_team_role_id,
        config.roles?.business_team_role_id,
        config.roles?.recruitment_team_role_id,
      ].filter(Boolean);

      // Vérifier permissions admin ou rôles staff
      return (
        member.permissions.has("Administrator") ||
        member.roles.cache.some((role) => staffRoles.includes(role.id))
      );
    } catch (error) {
      console.error("Erreur vérification staff:", error);
      return false;
    }
  }

  /**
   * Traiter un message
   */
  async processMessage(message) {
    // Ignorer les bots et DMs
    if (message.author.bot || !message.guild) return;

    // Ignorer les membres du staff
    if (this.isStaffMember(message.member)) return;

    // Vérifier les liens Discord
    if (this.hasDiscordLinks(message.content)) {
      try {
        // Supprimer le message
        await message.delete();
        console.log(
          `🔗 Lien Discord supprimé de ${message.author.tag} dans #${message.channel.name}`,
        );

        // Envoyer un avertissement temporaire
        const warning = await message.channel.send({
          content: `❌ <@${message.author.id}>, Discord invite links are not allowed on this server.`,
        });

        // Supprimer l'avertissement après 5 secondes
        setTimeout(async () => {
          try {
            await warning.delete();
          } catch {
            // Ignorer si déjà supprimé
          }
        }, 5000);
      } catch (error) {
        console.error("Erreur traitement lien Discord:", error);
      }
    }
  }
}

module.exports = SimpleModerationSystem;
