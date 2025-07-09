const ModerationDAO = require("../dao/moderationDAO");

class BanExpirationHandler {
  constructor(client) {
    this.client = client;
    this.moderationDAO = new ModerationDAO();
    this.checkInterval = 60000; // Vérifier toutes les minutes
  }

  /**
   * Démarrer le gestionnaire de bans expirés
   */
  start() {
    this.intervalId = setInterval(() => {
      this.checkExpiredBans();
    }, this.checkInterval);

    console.log("📅 Ban expiration handler started");
  }

  /**
   * Arrêter le gestionnaire
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log("📅 Ban expiration handler stopped");
    }
  }

  /**
   * Vérifier et traiter les bans expirés
   */
  async checkExpiredBans() {
    try {
      const expiredBans = await this.getExpiredBans();

      for (const ban of expiredBans) {
        await this.processExpiredBan(ban);
      }

      if (expiredBans.length > 0) {
        console.log(`📅 Processed ${expiredBans.length} expired ban(s)`);
      }
    } catch (error) {
      console.error("Error checking expired bans:", error);
    }
  }

  /**
   * Récupérer les bans expirés
   */
  async getExpiredBans() {
    try {
      const { getSharedConnection } = require("./dbInit");
      const db = await getSharedConnection();

      // Récupérer tous les bans qui ont expiré (date <= maintenant)
      const [rows] = await db.execute(
        `SELECT * FROM user_bans WHERE expires_at <= NOW()`,
      );
      return rows;
    } catch (error) {
      console.error("Error fetching expired bans:", error);
      return [];
    }
  }

  /**
   * Traiter un ban expiré
   */
  async processExpiredBan(banRecord) {
    try {
      const ConfigManager = require("./configManager");
      const config = ConfigManager.getInstance().getConfig();
      const guild = this.client.guilds.cache.first(); // Supposons qu'il n'y a qu'un serveur

      if (!guild) {
        console.error("Guild not found for ban expiration");
        return;
      }

      // Vérifier si l'utilisateur est toujours banni sur Discord
      const bans = await guild.bans.fetch();
      const bannedUser = bans.get(banRecord.user_id);

      if (bannedUser) {
        // L'utilisateur est toujours banni sur Discord, le débannir
        await guild.members.unban(banRecord.user_id, "Ban temporaire expiré");

        console.log(
          `✅ Automatically unbanned user ${banRecord.user_id} from Discord (ban expired)`,
        );
      } else {
        // L'utilisateur n'est plus banni sur Discord (débanni manuellement ou autre)
        console.log(
          `ℹ️ User ${banRecord.user_id} is no longer banned on Discord, cleaning up database records`,
        );
      }

      // Dans tous les cas, nettoyer la base de données
      await this.moderationDAO.removeBan(banRecord.user_id);
      await this.moderationDAO.unbanUser(
        banRecord.user_id,
        this.client.user.id,
      );

      // Logger l'action
      await this.moderationDAO.addSanction(
        banRecord.user_id,
        bannedUser ? "AUTO_UNBAN" : "AUTO_CLEANUP",
        bannedUser ? "Temporary ban expired" : "Cleaning up expired ban record",
        this.client.user.id,
      );

      // Essayer d'envoyer un DM à l'utilisateur seulement s'il était vraiment banni
      if (bannedUser) {
        try {
          const user = await this.client.users.fetch(banRecord.user_id);
          if (user) {
            const embed = {
              color: 0x00ff00,
              title: "🔓 Ban temporaire expiré",
              description: `Votre ban temporaire sur **${guild.name}** a expiré.`,
              fields: [
                {
                  name: "📝 Raison originale",
                  value: banRecord.reason || "Aucune raison fournie",
                  inline: false,
                },
              ],
              footer: {
                text: "Vous pouvez maintenant rejoindre le serveur.",
              },
              timestamp: new Date().toISOString(),
            };

            await user.send({ embeds: [embed] });
          }
        } catch (dmError) {
          console.log(
            `Could not send DM to user ${banRecord.user_id}:`,
            dmError.message,
          );
        }
      }

      // Log dans le canal de modération
      if (config.channels.moderation_channel_id) {
        const logChannel = guild.channels.cache.get(
          config.channels.moderation_channel_id,
        );
        if (logChannel) {
          const logEmbed = {
            color: bannedUser ? 0x00ff00 : 0xffa500,
            title: bannedUser
              ? "🔓 Ban temporaire expiré"
              : "🧹 Nettoyage ban expiré",
            description: bannedUser
              ? `Le ban temporaire de <@${banRecord.user_id}> a expiré`
              : `Nettoyage du ban expiré de <@${banRecord.user_id}> (déjà débanni)`,
            fields: [
              {
                name: "👤 Utilisateur",
                value: `<@${banRecord.user_id}> (${banRecord.user_id})`,
                inline: true,
              },
              {
                name: "📝 Raison originale",
                value: banRecord.reason || "Aucune raison fournie",
                inline: false,
              },
              {
                name: "⏰ Durée du ban",
                value: `Du ${new Date(banRecord.created_at).toLocaleString()} au ${new Date(banRecord.expires_at).toLocaleString()}`,
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          };

          await logChannel.send({ embeds: [logEmbed] });
        }
      }

      console.log(
        `✅ Processed expired ban for user ${banRecord.user_id} (${bannedUser ? "unbanned" : "cleaned up"})`,
      );
    } catch (error) {
      console.error(
        `Error processing expired ban for user ${banRecord.user_id}:`,
        error,
      );
    }
  }
}

module.exports = BanExpirationHandler;
