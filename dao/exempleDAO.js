/**
 * DAO d'exemple pour la gestion des utilisateurs
 * 
 * Ce module gère les opérations CRUD pour les tables users et user_stats.
 * Il sert d'exemple pour montrer comment structurer un DAO.
 * 
 * Fonctions disponibles :
 * - createUser() : Crée un nouvel utilisateur
 * - getUser() : Récupère un utilisateur par ID
 * - updateUser() : Met à jour les données d'un utilisateur
 * - getUserStats() : Récupère les statistiques d'un utilisateur
 * - updateStats() : Met à jour les statistiques
 * - addExperience() : Ajoute de l'expérience et gère les niveaux
 * - logActivity() : Enregistre une activité
 */

const { promisePool } = require("../utils/dbInit");

module.exports = {
  /**
   * Crée un nouvel utilisateur dans la base de données
   * 
   * @param {string} userId - ID Discord de l'utilisateur
   * @param {string} username - Nom d'utilisateur Discord
   * @param {string} displayName - Nom d'affichage (optionnel)
   * @returns {Promise<void>}
   */
  createUser: async (userId, username, displayName = null) => {
    try {
      // Créer l'utilisateur
      await promisePool.query(
        `INSERT INTO users (id, username, display_name) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE username = VALUES(username), display_name = VALUES(display_name)`,
        [userId, username, displayName]
      );

      // Créer ses statistiques par défaut
      await promisePool.query(
        `INSERT INTO user_stats (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id`,
        [userId]
      );

      console.log(`✅ Utilisateur ${username} créé/mis à jour`);
    } catch (error) {
      console.error("❌ Erreur lors de la création de l'utilisateur:", error);
      throw error;
    }
  },

  /**
   * Récupère un utilisateur par son ID
   * 
   * @param {string} userId - ID Discord de l'utilisateur
   * @returns {Promise<Object|null>} Données de l'utilisateur ou null
   */
  getUser: async (userId) => {
    try {
      const [rows] = await promisePool.query(
        `SELECT u.*, us.commands_used, us.messages_sent, us.time_online, 
                us.favorite_command, us.achievements, us.preferences
         FROM users u
         LEFT JOIN user_stats us ON u.id = us.user_id
         WHERE u.id = ?`,
        [userId]
      );

      if (rows.length === 0) return null;

      const user = rows[0];
      
      // Parser les JSON si ils existent
      if (user.achievements) {
        try {
          user.achievements = JSON.parse(user.achievements);
        } catch (e) {
          user.achievements = [];
        }
      }

      if (user.preferences) {
        try {
          user.preferences = JSON.parse(user.preferences);
        } catch (e) {
          user.preferences = {};
        }
      }

      return user;
    } catch (error) {
      console.error("❌ Erreur lors de la récupération de l'utilisateur:", error);
      throw error;
    }
  },

  /**
   * Met à jour les données de base d'un utilisateur
   * 
   * @param {string} userId - ID Discord de l'utilisateur
   * @param {Object} data - Données à mettre à jour
   * @returns {Promise<void>}
   */
  updateUser: async (userId, data) => {
    try {
      const fields = [];
      const values = [];

      // Construire dynamiquement la requête selon les champs fournis
      if (data.username) {
        fields.push('username = ?');
        values.push(data.username);
      }
      if (data.display_name !== undefined) {
        fields.push('display_name = ?');
        values.push(data.display_name);
      }
      if (data.level) {
        fields.push('level = ?');
        values.push(data.level);
      }
      if (data.experience !== undefined) {
        fields.push('experience = ?');
        values.push(data.experience);
      }
      if (data.coins !== undefined) {
        fields.push('coins = ?');
        values.push(data.coins);
      }
      if (data.is_premium !== undefined) {
        fields.push('is_premium = ?');
        values.push(data.is_premium);
      }

      if (fields.length === 0) return;

      values.push(userId);
      
      await promisePool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour de l'utilisateur:", error);
      throw error;
    }
  },

  /**
   * Met à jour les statistiques d'un utilisateur
   * 
   * @param {string} userId - ID Discord de l'utilisateur
   * @param {Object} stats - Statistiques à mettre à jour
   * @returns {Promise<void>}
   */
  updateStats: async (userId, stats) => {
    try {
      const fields = [];
      const values = [];

      if (stats.commands_used !== undefined) {
        fields.push('commands_used = ?');
        values.push(stats.commands_used);
      }
      if (stats.messages_sent !== undefined) {
        fields.push('messages_sent = ?');
        values.push(stats.messages_sent);
      }
      if (stats.time_online !== undefined) {
        fields.push('time_online = ?');
        values.push(stats.time_online);
      }
      if (stats.favorite_command) {
        fields.push('favorite_command = ?');
        values.push(stats.favorite_command);
      }
      if (stats.achievements) {
        fields.push('achievements = ?');
        values.push(JSON.stringify(stats.achievements));
      }
      if (stats.preferences) {
        fields.push('preferences = ?');
        values.push(JSON.stringify(stats.preferences));
      }

      if (fields.length === 0) return;

      values.push(userId);
      
      await promisePool.query(
        `UPDATE user_stats SET ${fields.join(', ')} WHERE user_id = ?`,
        values
      );
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour des statistiques:", error);
      throw error;
    }
  },

  /**
   * Ajoute de l'expérience à un utilisateur et gère les niveaux
   * 
   * @param {string} userId - ID Discord de l'utilisateur
   * @param {number} xpToAdd - Expérience à ajouter
   * @returns {Promise<Object>} Informations sur le gain (levelUp, newLevel, etc.)
   */
  addExperience: async (userId, xpToAdd) => {
    try {
      const user = await module.exports.getUser(userId);
      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      const currentXP = user.experience || 0;
      const currentLevel = user.level || 1;
      const newXP = currentXP + xpToAdd;

      // Calcul du nouveau niveau (formule simple: level = sqrt(xp/100))
      const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
      const levelUp = newLevel > currentLevel;

      // Mettre à jour en base
      await module.exports.updateUser(userId, {
        experience: newXP,
        level: newLevel
      });

      return {
        xpGained: xpToAdd,
        totalXP: newXP,
        levelUp,
        oldLevel: currentLevel,
        newLevel,
        nextLevelXP: Math.pow(newLevel, 2) * 100 // XP nécessaire pour le niveau suivant
      };
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout d'expérience:", error);
      throw error;
    }
  },

  /**
   * Enregistre une activité utilisateur
   * 
   * @param {string} userId - ID Discord de l'utilisateur
   * @param {string} action - Type d'action
   * @param {string} details - Détails de l'action
   * @returns {Promise<void>}
   */
  logActivity: async (userId, action, details = null) => {
    try {
      await promisePool.query(
        `INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)`,
        [userId, action, details]
      );
    } catch (error) {
      console.error("❌ Erreur lors de l'enregistrement de l'activité:", error);
      throw error;
    }
  },

  /**
   * Récupère le classement des utilisateurs par niveau
   * 
   * @param {number} limit - Nombre d'utilisateurs à récupérer
   * @returns {Promise<Array>} Liste des utilisateurs classés
   */
  getLeaderboard: async (limit = 10) => {
    try {
      const [rows] = await promisePool.query(
        `SELECT username, display_name, level, experience, coins 
         FROM users 
         ORDER BY level DESC, experience DESC 
         LIMIT ?`,
        [limit]
      );
      return rows;
    } catch (error) {
      console.error("❌ Erreur lors de la récupération du classement:", error);
      throw error;
    }
  },

  /**
   * Incrémente le compteur de commandes utilisées
   * 
   * @param {string} userId - ID Discord de l'utilisateur
   * @param {string} commandName - Nom de la commande
   * @returns {Promise<void>}
   */
  incrementCommandUsage: async (userId, commandName) => {
    try {
      // Incrémenter le compteur
      await promisePool.query(
        `UPDATE user_stats SET commands_used = commands_used + 1 WHERE user_id = ?`,
        [userId]
      );

      // Log de l'activité
      await module.exports.logActivity(userId, 'command', commandName);

      // Ajouter de l'XP pour l'utilisation de commande
      await module.exports.addExperience(userId, 10);
    } catch (error) {
      console.error("❌ Erreur lors de l'incrémentation des commandes:", error);
      throw error;
    }
  }
};
