const { getSharedConnection } = require("../utils/dbInit");

class WarrantyDAO {
  constructor() {}

  async getConnection() {
    return await getSharedConnection();
  }

  /**
   * Créer un nouveau code premium/garantie
   */
  async createCode(code, productInfo = null) {
    const connection = await this.getConnection();
    const [result] = await connection.execute(
      "INSERT INTO warranty_premium_codes (code, product_info) VALUES (?, ?)",
      [code, productInfo],
    );
    return result.insertId;
  }

  /**
   * Vérifier si un code existe et n'est pas utilisé
   */
  async validateCode(code) {
    const connection = await this.getConnection();
    const [rows] = await connection.execute(
      "SELECT id, user_id, is_used, warranty_activated FROM warranty_premium_codes WHERE code = ?",
      [code],
    );

    if (rows.length === 0) {
      return { valid: false, reason: "Code not found" };
    }

    const codeData = rows[0];
    if (codeData.is_used) {
      return { valid: false, reason: "Code already used", data: codeData };
    }

    return { valid: true, data: codeData };
  } /**
   * Récupérer un code par sa valeur
   */
  async getCodeByValue(code) {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM warranty_premium_codes WHERE code = ?",
        [code],
      );

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error(
        `\x1b[38;5;1m❌ Erreur lors de la récupération du code: ${error.message}\x1b[0m`,
      );
      throw error;
    }
  } /**
   * Lier un code à un utilisateur (étape 1)
   */
  async linkCodeToUser(code, userId) {
    const connection = await this.getConnection();
    try {
      // D'abord vérifier si le code existe et son statut
      const [codeRows] = await connection.execute(
        "SELECT id, user_id, is_used, warranty_activated, warranty_expires_at FROM warranty_premium_codes WHERE code = ?",
        [code],
      );

      if (codeRows.length === 0) {
        throw new Error("Code not found");
      }

      const codeData = codeRows[0];

      // Si le code est déjà lié à un autre utilisateur
      if (codeData.user_id && codeData.user_id !== userId) {
        throw new Error("Code already linked to another user");
      }

      // Si le code est déjà lié au même utilisateur
      if (codeData.user_id === userId) {
        console.log(
          `\x1b[38;5;3m⚠️ Code ${code} déjà lié à l'utilisateur ${userId}\x1b[0m`,
        );
        return true;
      }

      // Lier le code à l'utilisateur (même s'il est déjà activé)
      const [result] = await connection.execute(
        "UPDATE warranty_premium_codes SET user_id = ?, is_used = TRUE, linked_at = NOW() WHERE code = ?",
        [userId, code],
      );

      if (result.affectedRows === 0) {
        throw new Error("Failed to link code");
      }

      // Mettre à jour la sauvegarde des rôles
      // Déterminer si l'utilisateur a une garantie active
      const hasWarranty =
        codeData.warranty_activated &&
        codeData.warranty_expires_at &&
        new Date(codeData.warranty_expires_at) > new Date();
      await connection.execute(
        "INSERT INTO user_roles_backup (user_id, has_premium, has_warranty, code_linked, warranty_expires_at) VALUES (?, TRUE, ?, TRUE, ?) ON DUPLICATE KEY UPDATE has_premium = TRUE, has_warranty = ?, code_linked = TRUE, warranty_expires_at = ?, last_updated = NOW()",
        [
          userId,
          hasWarranty,
          codeData.warranty_expires_at,
          hasWarranty,
          codeData.warranty_expires_at,
        ],
      );

      console.log(
        `\x1b[38;5;2m✅ Code ${code} lié à l'utilisateur ${userId}\x1b[0m`,
      );
      return {
        success: true,
        codeData: codeData,
        warrantyActivated: codeData.warranty_activated,
        warrantyExpires: codeData.warranty_expires_at,
      };
    } catch (error) {
      console.error(
        `\x1b[38;5;1m❌ Erreur lors du linkage du code: ${error.message}\x1b[0m`,
      );
      throw error;
    }
  } /**
   * Activer la garantie par un admin (étape 2)
   * Peut activer un code avec ou sans utilisateur assigné
   */
  async activateWarranty(code, adminId, userId = null) {
    const connection = await this.getConnection();
    try {
      // Récupérer les infos du code
      const [codeRows] = await connection.execute(
        "SELECT id, user_id, warranty_activated, is_used FROM warranty_premium_codes WHERE code = ?",
        [code],
      );

      if (codeRows.length === 0) {
        throw new Error("Code not found");
      }

      const codeData = codeRows[0];

      // Si le code est déjà activé
      if (codeData.warranty_activated) {
        throw new Error("Warranty already activated");
      }

      let targetUserId = codeData.user_id;

      // Si le code n'est pas lié à un utilisateur
      if (!codeData.user_id) {
        if (userId) {
          targetUserId = userId;

          // Mettre à jour la sauvegarde des rôles
          await connection.execute(
            "INSERT INTO user_roles_backup (user_id, has_premium, code_linked, last_updated) VALUES (?, TRUE, TRUE, NOW()) ON DUPLICATE KEY UPDATE has_premium = TRUE, code_linked = TRUE, last_updated = NOW()",
            [userId],
          );
        } else {
          // Activer le code sans l'assigner à un utilisateur
          // Le code reste disponible pour être lié plus tard
          targetUserId = null;
          console.log(
            `[WarrantyDAO] Activation de garantie sans utilisateur pour le code: ${code}`,
          );
        }
      }

      // Activer la garantie (1 an) et lier l'utilisateur si nécessaire en une seule requête
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      if (targetUserId && !codeData.user_id) {
        // Cas 1: Lier l'utilisateur ET activer la garantie
        await connection.execute(
          "UPDATE warranty_premium_codes SET user_id = ?, is_used = TRUE, linked_at = NOW(), warranty_activated = TRUE, warranty_activated_by = ?, warranty_activated_at = NOW(), warranty_expires_at = ? WHERE id = ?",
          [targetUserId, adminId, expirationDate, codeData.id],
        );
      } else {
        // Cas 2: Seulement activer la garantie (code déjà lié ou activation sans utilisateur)
        await connection.execute(
          "UPDATE warranty_premium_codes SET warranty_activated = TRUE, warranty_activated_by = ?, warranty_activated_at = NOW(), warranty_expires_at = ? WHERE id = ?",
          [adminId, expirationDate, codeData.id],
        );
      }

      // Mettre à jour la sauvegarde des rôles (seulement si un utilisateur est assigné)
      if (targetUserId) {
        await connection.execute(
          "UPDATE user_roles_backup SET has_warranty = TRUE, warranty_expires_at = ?, last_updated = NOW() WHERE user_id = ?",
          [expirationDate, targetUserId],
        );
      }

      // Logger l'action
      await connection.execute(
        "INSERT INTO warranty_activation_logs (user_id, admin_id, code_id, action_type, duration_days) VALUES (?, ?, ?, ?, ?)",
        [targetUserId, adminId, codeData.id, "ACTIVATE", 365],
      );

      console.log(
        `\x1b[38;5;2m✅ Garantie activée avec succès - Code: ${code}, Utilisateur: ${targetUserId || "Aucun"}, Admin: ${adminId}\x1b[0m`,
      );

      return {
        userId: targetUserId,
        expirationDate,
        codeActivatedWithoutUser: !targetUserId,
      };
    } catch (error) {
      console.error(
        `\x1b[38;5;1m❌ Erreur lors de l'activation de la garantie: ${error.message}\x1b[0m`,
      );
      throw error;
    }
  }

  /**
   * Vérifier le statut d'un utilisateur
   */
  async checkUserStatus(userId) {
    const connection = await this.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM user_roles_backup WHERE user_id = ?",
      [userId],
    );

    if (rows.length === 0) {
      return { has_premium: false, has_warranty: false, code_linked: false };
    }

    return rows[0];
  }

  /**
   * Obtenir tous les codes liés sans garantie activée
   */
  async getPendingWarranties() {
    const connection = await this.getConnection();
    const [rows] = await connection.execute(
      "SELECT code, user_id, linked_at FROM warranty_premium_codes WHERE is_used = TRUE AND warranty_activated = FALSE ORDER BY linked_at ASC",
    );
    return rows;
  }

  /**
   * Prolonger une garantie
   */
  async extendWarranty(userId, days, adminId) {
    const connection = await this.getConnection();

    if (userId) {
      // Cas 1: Code lié à un utilisateur - utiliser l'ancienne logique
      // Récupérer les infos actuelles
      const [userRows] = await connection.execute(
        "SELECT warranty_expires_at FROM user_roles_backup WHERE user_id = ? AND has_warranty = TRUE",
        [userId],
      );

      if (userRows.length === 0) {
        throw new Error("User has no active warranty");
      }

      // Calculer la nouvelle date d'expiration
      const currentExpiration = new Date(userRows[0].warranty_expires_at);
      const newExpiration = new Date(
        currentExpiration.getTime() + days * 24 * 60 * 60 * 1000,
      );

      // Mettre à jour
      await connection.execute(
        "UPDATE user_roles_backup SET warranty_expires_at = ?, last_updated = NOW() WHERE user_id = ?",
        [newExpiration, userId],
      );

      await connection.execute(
        "UPDATE warranty_premium_codes SET warranty_expires_at = ? WHERE user_id = ? AND warranty_activated = TRUE",
        [newExpiration, userId],
      );

      // Logger l'action
      const [codeRows] = await connection.execute(
        "SELECT id FROM warranty_premium_codes WHERE user_id = ? AND warranty_activated = TRUE LIMIT 1",
        [userId],
      );
      if (codeRows.length > 0) {
        await connection.execute(
          "INSERT INTO warranty_activation_logs (user_id, admin_id, code_id, action_type, duration_days) VALUES (?, ?, ?, ?, ?)",
          [userId, adminId, codeRows[0].id, "EXTEND", days],
        );
      }

      return newExpiration;
    } else {
      // Cas 2: Code non lié - impossible d'étendre sans référence au code
      throw new Error("Cannot extend warranty without user or code reference");
    }
  }

  /**
   * Prolonger une garantie par code (pour codes liés ou non liés)
   */
  async extendWarrantyByCode(code, days, adminId) {
    const connection = await this.getConnection();

    // Récupérer les infos du code
    const [codeRows] = await connection.execute(
      "SELECT id, user_id, warranty_expires_at, warranty_activated FROM warranty_premium_codes WHERE code = ? AND warranty_activated = TRUE",
      [code],
    );

    if (codeRows.length === 0) {
      throw new Error("Code not found or warranty not activated");
    }

    const codeData = codeRows[0];

    // Calculer la nouvelle date d'expiration
    const currentExpiration = new Date(codeData.warranty_expires_at);
    const newExpiration = new Date(
      currentExpiration.getTime() + days * 24 * 60 * 60 * 1000,
    );

    // Mettre à jour la date d'expiration dans warranty_premium_codes
    await connection.execute(
      "UPDATE warranty_premium_codes SET warranty_expires_at = ? WHERE id = ?",
      [newExpiration, codeData.id],
    );

    // Si le code est lié à un utilisateur, mettre à jour aussi user_roles_backup
    if (codeData.user_id) {
      await connection.execute(
        "UPDATE user_roles_backup SET warranty_expires_at = ?, last_updated = NOW() WHERE user_id = ?",
        [newExpiration, codeData.user_id],
      );
    }

    // Logger l'action
    await connection.execute(
      "INSERT INTO warranty_activation_logs (user_id, admin_id, code_id, action_type, duration_days) VALUES (?, ?, ?, ?, ?)",
      [codeData.user_id, adminId, codeData.id, "EXTEND", days],
    );

    console.log(
      `\x1b[38;5;2m✅ Garantie étendue pour le code ${code} - Nouvelle expiration: ${newExpiration.toISOString()}\x1b[0m`,
    );

    return newExpiration;
  }

  /**
   * Obtenir les garanties qui expirent bientôt
   */
  async getExpiringWarranties(daysBeforeExpiration = 7) {
    const connection = await this.getConnection();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysBeforeExpiration);

    const [rows] = await connection.execute(
      "SELECT user_id, warranty_expires_at FROM user_roles_backup WHERE has_warranty = TRUE AND warranty_expires_at <= ? AND warranty_expires_at > NOW()",
      [futureDate],
    );
    return rows;
  }

  /**
   * Récupérer les codes en attente d'activation
   */
  async getPendingCodes(guildId, days = 30) {
    const connection = await this.getConnection();
    const [rows] = await connection.execute(
      `SELECT wpc.*, urb.user_id as linked_user_id 
                 FROM warranty_premium_codes wpc 
                 LEFT JOIN user_roles_backup urb ON wpc.user_id = urb.user_id 
                 WHERE wpc.is_used = TRUE 
                 AND wpc.warranty_activated = FALSE 
                 AND wpc.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 ORDER BY wpc.created_at DESC`,
      [days],
    );

    return rows;
  }

  /**
   * Récupérer les garanties proches de l'expiration
   */
  async getWarrantiesNearExpiration(guildId, days) {
    const connection = await this.getConnection();
    console.log(
      `[WarrantyDAO] Recherche des garanties expirant dans ${days} jours`,
    );

    const [rows] = await connection.execute(
      `SELECT wpc.* 
                 FROM warranty_premium_codes wpc 
                 WHERE wpc.warranty_activated = TRUE 
                 AND wpc.warranty_expires_at <= DATE_ADD(NOW(), INTERVAL ? DAY)
                 AND wpc.warranty_expires_at > NOW()`,
      [days],
    );

    console.log(
      `[WarrantyDAO] Trouvé ${rows.length} garanties expirant dans ${days} jours`,
    );
    return rows;
  }

  /**
   * Marquer un rappel comme envoyé
   */
  async markReminderSent(warrantyId, reminderType) {
    console.log(
      `[WarrantyDAO] Tentative de marquer le rappel ${reminderType} pour la garantie ${warrantyId}`,
    );

    // Pour l'instant, on simule le succès sans modifier la base
    // car la colonne reminder_sent n'existe pas encore
    console.log(
      `[WarrantyDAO] Rappel ${reminderType} marqué comme envoyé (simulation)`,
    );
    return true;
  }

  /**
   * Récupérer les garanties expirées
   */
  async getExpiredWarranties() {
    const connection = await this.getConnection();
    console.log(`[WarrantyDAO] Recherche des garanties expirées`);

    const [rows] = await connection.execute(
      `SELECT wpc.* 
                 FROM warranty_premium_codes wpc 
                 WHERE wpc.warranty_activated = TRUE 
                 AND wpc.warranty_expires_at <= NOW()`,
    );

    console.log(`[WarrantyDAO] Trouvé ${rows.length} garanties expirées`);
    return rows;
  }

  /**
   * Désactiver une garantie expirée
   */
  async deactivateExpiredWarranty(userId) {
    const connection = await this.getConnection();
    await connection.execute(
      "UPDATE user_roles_backup SET has_warranty = FALSE, last_updated = NOW() WHERE user_id = ?",
      [userId],
    );

    await connection.execute(
      "UPDATE warranty_premium_codes SET warranty_activated = FALSE WHERE user_id = ? AND warranty_activated = TRUE",
      [userId],
    );

    return true;
  }

  /**
   * Logger la restauration de rôles
   */
  async logRoleRestoration(userId, rolesRestored, triggerType = "rejoin") {
    const connection = await this.getConnection();
    await connection.execute(
      "INSERT INTO role_restoration_logs (user_id, roles_restored, trigger_type) VALUES (?, ?, ?)",
      [userId, rolesRestored, triggerType],
    );
    return true;
  }

  /**
   * Créer une sauvegarde de rôles de base
   */ async createRoleBackup(data) {
    const connection = await this.getConnection();
    const [result] = await connection.execute(
      `INSERT INTO user_roles_backup 
                 (user_id, has_premium, has_warranty, code_linked, warranty_expires_at) 
                 VALUES (?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.has_premium,
        data.has_warranty,
        data.code_linked,
        data.warranty_expires_at,
      ],
    );

    return result.insertId;
  }

  /**
   * Récupérer les garanties actives
   */
  async getActiveWarranties(guildId) {
    const connection = await this.getConnection();
    console.log(
      `[WarrantyDAO] Recherche des garanties actives pour le serveur: ${guildId}`,
    );

    const [rows] = await connection.execute(
      `SELECT wpc.id as warranty_id, wpc.user_id, wpc.warranty_expires_at, wpc.code
                 FROM warranty_premium_codes wpc 
                 WHERE wpc.warranty_activated = TRUE 
                 AND wpc.warranty_expires_at > NOW()`,
    );

    console.log(`[WarrantyDAO] Trouvé ${rows.length} garanties actives`);
    return rows;
  } /**
   * Récupérer la garantie d'un utilisateur
   */
  async getUserWarranty(userId) {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT wpc.*, urb.* 
                 FROM warranty_premium_codes wpc 
                 LEFT JOIN user_roles_backup urb ON wpc.user_id = urb.user_id 
                 WHERE wpc.user_id = ? AND wpc.warranty_activated = TRUE 
                 AND wpc.warranty_expires_at > NOW()
                 ORDER BY wpc.warranty_expires_at DESC 
                 LIMIT 1`,
        [userId],
      );

      if (rows.length === 0) {
        return null;
      }

      const warranty = rows[0];
      return {
        warranty_id: warranty.id,
        user_id: warranty.user_id,
        code: warranty.code,
        expiration_date: warranty.warranty_expires_at,
        warranty_expires_at: warranty.warranty_expires_at,
        code_linked: warranty.is_used,
        warranty_activated: warranty.warranty_activated,
        has_premium: warranty.has_premium || false,
        has_warranty: warranty.has_warranty || false,
      };
    } catch (error) {
      console.error(
        `\x1b[38;5;1m❌ Erreur lors de la récupération de la garantie: ${error.message}\x1b[0m`,
      );
      return null;
    }
  } /**
   * Mettre à jour le statut des rôles d'un utilisateur
   */
  async updateUserRoleStatus(data) {
    const connection = await this.getConnection();
    try {
      await connection.execute(
        `INSERT INTO user_roles_backup 
                 (user_id, has_premium, has_warranty, code_linked, warranty_expires_at, last_updated) 
                 VALUES (?, ?, ?, ?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE 
                 has_premium = VALUES(has_premium),
                 has_warranty = VALUES(has_warranty),
                 code_linked = VALUES(code_linked),
                 warranty_expires_at = VALUES(warranty_expires_at),
                 last_updated = NOW()`,
        [
          data.user_id,
          data.has_premium,
          data.has_warranty,
          data.code_linked,
          data.warranty_expires_at,
        ],
      );

      console.log(
        `\x1b[38;5;2m✅ Statut des rôles mis à jour pour l'utilisateur: ${data.user_id}\x1b[0m`,
      );
      return true;
    } catch (error) {
      console.error(
        `\x1b[38;5;1m❌ Erreur lors de la mise à jour du statut des rôles: ${error.message}\x1b[0m`,
      );
      return false;
    }
  }

  /**
   * Logger une action de garantie
   */
  async logWarrantyAction(actionData) {
    const connection = await this.getConnection();
    try {
      await connection.execute(
        `INSERT INTO warranty_activation_logs 
                 (user_id, admin_id, code_id, action_type, duration_days) 
                 VALUES (?, ?, ?, ?, ?)`,
        [
          actionData.user_id,
          actionData.performed_by || actionData.admin_id,
          actionData.warranty_id || actionData.code_id,
          actionData.action_type,
          actionData.duration_days || null,
        ],
      );

      console.log(
        `\x1b[38;5;2m✅ Action de garantie loggée: ${actionData.action_type}\x1b[0m`,
      );
      return true;
    } catch (error) {
      console.error(
        `\x1b[38;5;1m❌ Erreur lors du logging de l'action de garantie: ${error.message}\x1b[0m`,
      );
      return false;
    }
  }

  /**
   * Mettre à jour le statut des rôles d'un utilisateur
   */
  async updateRoleStatus(warrantyId, hasWarranty) {
    const connection = await this.getConnection();
    try {
      // Récupérer l'user_id du warranty
      const [warrantyRows] = await connection.execute(
        "SELECT user_id FROM warranty_premium_codes WHERE id = ?",
        [warrantyId],
      );

      if (warrantyRows.length === 0) {
        throw new Error("Warranty not found");
      }

      const userId = warrantyRows[0].user_id;

      // Mettre à jour le statut dans user_roles_backup
      await connection.execute(
        "UPDATE user_roles_backup SET has_warranty = ?, last_updated = NOW() WHERE user_id = ?",
        [hasWarranty, userId],
      );

      console.log(
        `✅ Statut de garantie mis à jour pour l'utilisateur ${userId}: ${hasWarranty}`,
      );
      return true;
    } catch (error) {
      console.error(
        `❌ Erreur lors de la mise à jour du statut de rôle: ${error.message}`,
      );
      throw error;
    }
  }
}

module.exports = WarrantyDAO;
