const { getSharedConnection } = require("../utils/dbInit");

class ModerationDAO {
  constructor() {}

  async getConnection() {
    return await getSharedConnection();
  }

  /**
   * Ajouter une sanction dans l'historique
   */
  async addSanction(
    userId,
    actionType,
    reason,
    moderatorId = null,
    messageContent = null,
    duration = null,
  ) {
    const db = await this.getConnection();
    try {
      // Insérer dans les logs de modération
      await db.execute(
        `INSERT INTO moderation_logs (user_id, moderator_id, action_type, reason, duration, message_content) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, moderatorId, actionType, reason, duration, messageContent],
      );

      return true;
    } catch (error) {
      console.error("Error adding sanction to history:", error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique de modération d'un utilisateur
   */
  async getUserSanctionHistory(userId, limit = 10) {
    const db = await this.getConnection();
    try {
      // Convertir limit en entier pour éviter l'erreur MySQL
      const limitInt = parseInt(limit, 10);
      const [rows] = await db.execute(
        `SELECT * FROM moderation_logs 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ${limitInt}`,
        [userId],
      );
      return rows;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique:", error);
      throw error;
    }
  }

  /**
   * Bannir un utilisateur
   */
  async banUser(userId, moderatorId, reason, expiresAt = null) {
    const db = await this.getConnection();
    try {
      // Mettre à jour le statut dans user_status
      await db.execute(
        `INSERT INTO user_status (user_id, is_banned) 
         VALUES (?, true) 
         ON DUPLICATE KEY UPDATE is_banned = true`,
        [userId],
      );

      // Ajouter à la table user_bans avec date d'expiration
      // Si pas d'expiration, on met une date très lointaine (100 ans)
      const banExpiresAt =
        expiresAt || new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
      await db.execute(
        `INSERT INTO user_bans (user_id, expires_at, reason) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE expires_at = ?, reason = ?`,
        [userId, banExpiresAt, reason, banExpiresAt, reason],
      );

      // Logger dans moderation_logs
      await db.execute(
        `INSERT INTO moderation_logs (user_id, moderator_id, action_type, reason) 
         VALUES (?, ?, 'BAN', ?)`,
        [userId, moderatorId, reason],
      );

      return true;
    } catch (error) {
      console.error("Erreur lors du bannissement:", error);
      throw error;
    }
  }

  /**
   * Débannir un utilisateur
   */
  async unbanUser(userId, moderatorId) {
    const db = await this.getConnection();
    try {
      // Mettre à jour le statut dans user_status
      await db.execute(
        `INSERT INTO user_status (user_id, is_banned) 
         VALUES (?, false) 
         ON DUPLICATE KEY UPDATE is_banned = false`,
        [userId],
      );

      // Supprimer de la table user_bans
      await db.execute(`DELETE FROM user_bans WHERE user_id = ?`, [userId]);

      // Logger dans moderation_logs
      await db.execute(
        `INSERT INTO moderation_logs (user_id, moderator_id, action_type, reason) 
         VALUES (?, ?, 'UNBAN', 'User unbanned by moderator')`,
        [userId, moderatorId],
      );

      return true;
    } catch (error) {
      console.error("Erreur lors du débannissement:", error);
      throw error;
    }
  }
  /**
   * Réinitialiser l'historique d'un utilisateur
   */
  async resetUserHistory(
    userId,
    moderatorId,
    reason = "History reset by moderator",
  ) {
    const db = await this.getConnection();
    try {
      await db.execute(
        `INSERT INTO moderation_logs (user_id, moderator_id, action_type, reason) 
         VALUES (?, ?, 'RESET_HISTORY', ?)`,
        [userId, moderatorId, reason],
      );

      return true;
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation de l'historique:",
        error,
      );
      throw error;
    }
  }

  /**
   * Vérifier si un utilisateur est banni
   */
  async isUserBanned(userId) {
    const db = await this.getConnection();
    try {
      const [rows] = await db.execute(
        "SELECT is_banned FROM user_status WHERE user_id = ?",
        [userId],
      );
      return rows[0]?.is_banned || false;
    } catch (error) {
      console.error("Erreur lors de la vérification du ban:", error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques de modération avec dates filtrées
   */
  async getModerationStats(startDate = null) {
    const db = await this.getConnection();
    try {
      let query = `SELECT action_type, COUNT(*) as count FROM moderation_logs`;
      let params = [];

      if (startDate) {
        query += ` WHERE created_at >= ?`;
        params.push(startDate);
      }

      query += ` GROUP BY action_type ORDER BY count DESC`;

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des modérateurs
   */
  async getModeratorStats(startDate = null) {
    const db = await this.getConnection();
    try {
      let query = `SELECT moderator_id, COUNT(*) as action_count FROM moderation_logs WHERE moderator_id IS NOT NULL`;
      let params = [];

      if (startDate) {
        query += ` AND created_at >= ?`;
        params.push(startDate);
      }

      query += ` GROUP BY moderator_id ORDER BY action_count DESC`;

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des stats modérateurs:",
        error,
      );
      throw error;
    }
  }

  /**
   * Obtenir la liste des bans actifs
   */
  async getActiveBans() {
    const db = await this.getConnection();
    try {
      const [rows] = await db.execute(
        `SELECT user_id FROM user_status WHERE is_banned = true`,
      );
      return rows;
    } catch (error) {
      console.error("Erreur lors de la récupération des bans actifs:", error);
      throw error;
    }
  }

  /**
   * Ajouter un utilisateur à la table des bans temporaires
   */
  async addBan(userId, expiresAt, reason) {
    const db = await this.getConnection();
    try {
      await db.execute(
        `INSERT INTO user_bans (user_id, expires_at, reason) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE expires_at = ?, reason = ?`,
        [userId, expiresAt, reason, expiresAt, reason],
      );
      return true;
    } catch (error) {
      console.error("Erreur lors de l'ajout du ban temporaire:", error);
      throw error;
    }
  }

  /**
   * Supprimer un ban temporaire
   */
  async removeBan(userId) {
    const db = await this.getConnection();
    try {
      await db.execute(`DELETE FROM user_bans WHERE user_id = ?`, [userId]);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression du ban:", error);
      throw error;
    }
  }

  /**
   * Logger une action de modération simplifiée
   */
  async logModerationAction(
    userId,
    actionType,
    reason,
    moderatorId = null,
    duration = null,
    additionalInfo = null,
  ) {
    const db = await this.getConnection();
    try {
      await db.execute(
        `INSERT INTO moderation_logs (user_id, moderator_id, action_type, reason, duration, message_content) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, moderatorId, actionType, reason, duration, additionalInfo],
      );
    } catch (error) {
      console.error("Error logging moderation action:", error);
      throw error;
    }
  }
}

module.exports = ModerationDAO;
