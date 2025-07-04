const { getSharedConnection } = require('../utils/dbInit');

class WarrantyDAO {
    constructor() {
        // Plus besoin de configuration de base de données ici
        // Tout est géré par dbInit
    }

    async getConnection() {
        return await getSharedConnection();
    }

    // ===== GESTION DES CODES PREMIUM/GARANTIE =====

    /**
     * Créer un nouveau code premium/garantie
     */
    async createCode(code, productInfo = null) {
        const connection = await this.getConnection();
        const [result] = await connection.execute(
            'INSERT INTO warranty_premium_codes (code, product_info) VALUES (?, ?)',
            [code, productInfo]
        );
        return result.insertId;
    }

    /**
     * Vérifier si un code existe et n'est pas utilisé
     */
    async validateCode(code) {
        const connection = await this.getConnection();
            const [rows] = await connection.execute(
                'SELECT id, user_id, is_used, warranty_activated FROM warranty_premium_codes WHERE code = ?',
                [code]
            );
            
            if (rows.length === 0) {
                return { valid: false, reason: 'Code not found' };
            }
            
            const codeData = rows[0];
            if (codeData.is_used) {
                return { valid: false, reason: 'Code already used', data: codeData };
            }
            
            return { valid: true, data: codeData };
    }

    /**
     * Récupérer un code par sa valeur
     */
    async getCodeByValue(code) {
        const connection = await this.getConnection();
            const [rows] = await connection.execute(
                'SELECT * FROM warranty_premium_codes WHERE code = ?',
                [code]
            );
            
            return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Lier un code à un utilisateur (étape 1)
     */
    async linkCodeToUser(code, userId) {
        const connection = await this.getConnection();
            const [result] = await connection.execute(
                'UPDATE warranty_premium_codes SET user_id = ?, is_used = TRUE, linked_at = NOW() WHERE code = ? AND is_used = FALSE',
                [userId, code]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Code not found or already used');
            }

            // Mettre à jour la sauvegarde des rôles
            await connection.execute(
                'INSERT INTO user_roles_backup (user_id, has_premium, code_linked, last_updated) VALUES (?, TRUE, TRUE, NOW()) ON DUPLICATE KEY UPDATE has_premium = TRUE, code_linked = TRUE, last_updated = NOW()',
                [userId]
            );

            return true;
    }

    /**
     * Activer la garantie par un admin (étape 2)
     */
    async activateWarranty(code, adminId) {
        const connection = await this.getConnection();
            // Récupérer les infos du code
            const [codeRows] = await connection.execute(
                'SELECT id, user_id, warranty_activated FROM warranty_premium_codes WHERE code = ?',
                [code]
            );

            if (codeRows.length === 0) {
                throw new Error('Code not found');
            }

            const codeData = codeRows[0];
            if (!codeData.user_id) {
                throw new Error('Code not linked to any user');
            }

            if (codeData.warranty_activated) {
                throw new Error('Warranty already activated');
            }

            // Activer la garantie (1 an)
            const expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);

            await connection.execute(
                'UPDATE warranty_premium_codes SET warranty_activated = TRUE, warranty_activated_by = ?, warranty_activated_at = NOW(), warranty_expires_at = ? WHERE id = ?',
                [adminId, expirationDate, codeData.id]
            );

            // Mettre à jour la sauvegarde des rôles
            await connection.execute(
                'UPDATE user_roles_backup SET has_warranty = TRUE, warranty_expires_at = ?, last_updated = NOW() WHERE user_id = ?',
                [expirationDate, codeData.user_id]
            );

            // Logger l'action
            await connection.execute(
                'INSERT INTO warranty_activation_logs (user_id, admin_id, code_id, action_type, duration_days) VALUES (?, ?, ?, ?, ?)',
                [codeData.user_id, adminId, codeData.id, 'activate', 365]
            );

            return { userId: codeData.user_id, expirationDate };
    }

    /**
     * Vérifier le statut d'un utilisateur
     */
    async checkUserStatus(userId) {
        const connection = await this.getConnection();
            const [rows] = await connection.execute(
                'SELECT * FROM user_roles_backup WHERE user_id = ?',
                [userId]
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
                'SELECT code, user_id, linked_at FROM warranty_premium_codes WHERE is_used = TRUE AND warranty_activated = FALSE ORDER BY linked_at ASC'
            );
            return rows;
    }

    /**
     * Prolonger une garantie
     */
    async extendWarranty(userId, days, adminId) {
        const connection = await this.getConnection();
            // Récupérer les infos actuelles
            const [userRows] = await connection.execute(
                'SELECT warranty_expires_at FROM user_roles_backup WHERE user_id = ? AND has_warranty = TRUE',
                [userId]
            );

            if (userRows.length === 0) {
                throw new Error('User has no active warranty');
            }

            // Calculer la nouvelle date d'expiration
            const currentExpiration = new Date(userRows[0].warranty_expires_at);
            const newExpiration = new Date(currentExpiration.getTime() + (days * 24 * 60 * 60 * 1000));

            // Mettre à jour
            await connection.execute(
                'UPDATE user_roles_backup SET warranty_expires_at = ?, last_updated = NOW() WHERE user_id = ?',
                [newExpiration, userId]
            );

            await connection.execute(
                'UPDATE warranty_premium_codes SET warranty_expires_at = ? WHERE user_id = ? AND warranty_activated = TRUE',
                [newExpiration, userId]
            );

            // Logger l'action
            const [codeRows] = await connection.execute(
                'SELECT id FROM warranty_premium_codes WHERE user_id = ? AND warranty_activated = TRUE LIMIT 1',
                [userId]
            );

            if (codeRows.length > 0) {
                await connection.execute(
                    'INSERT INTO warranty_activation_logs (user_id, admin_id, code_id, action_type, duration_days) VALUES (?, ?, ?, ?, ?)',
                    [userId, adminId, codeRows[0].id, 'extend', days]
                );
            }

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
                'SELECT user_id, warranty_expires_at FROM user_roles_backup WHERE has_warranty = TRUE AND warranty_expires_at <= ? AND warranty_expires_at > NOW()',
                [futureDate]
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
                [days]
            );
            
            return rows;
    }

    /**
     * Récupérer les garanties proches de l'expiration
     */
    async getWarrantiesNearExpiration(guildId, days) {
        const connection = await this.getConnection();
            console.log(`[WarrantyDAO] Recherche des garanties expirant dans ${days} jours`);
            
            const [rows] = await connection.execute(
                `SELECT wpc.* 
                 FROM warranty_premium_codes wpc 
                 WHERE wpc.warranty_activated = TRUE 
                 AND wpc.warranty_expires_at <= DATE_ADD(NOW(), INTERVAL ? DAY)
                 AND wpc.warranty_expires_at > NOW()`,
                [days]
            );
            
            console.log(`[WarrantyDAO] Trouvé ${rows.length} garanties expirant dans ${days} jours`);
            return rows;
    }

    /**
     * Marquer un rappel comme envoyé
     */
    async markReminderSent(warrantyId, reminderType) {
        console.log(`[WarrantyDAO] Tentative de marquer le rappel ${reminderType} pour la garantie ${warrantyId}`);
        
        // Pour l'instant, on simule le succès sans modifier la base
        // car la colonne reminder_sent n'existe pas encore
        console.log(`[WarrantyDAO] Rappel ${reminderType} marqué comme envoyé (simulation)`);
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
                 AND wpc.warranty_expires_at <= NOW()`
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
                'UPDATE user_roles_backup SET has_warranty = FALSE, last_updated = NOW() WHERE user_id = ?',
                [userId]
            );

            await connection.execute(
                'UPDATE warranty_premium_codes SET warranty_activated = FALSE WHERE user_id = ? AND warranty_activated = TRUE',
                [userId]
            );

            return true;
    }

    /**
     * Logger la restauration de rôles
     */
    async logRoleRestoration(userId, rolesRestored, triggerType = 'rejoin') {
        const connection = await this.getConnection();
            await connection.execute(
                'INSERT INTO role_restoration_logs (user_id, roles_restored, trigger_type) VALUES (?, ?, ?)',
                [userId, rolesRestored, triggerType]
            );
            return true;
    }

    /**
     * Créer une sauvegarde de rôles de base
     */
    async createRoleBackup(data) {
        const connection = await this.getConnection();
            const [result] = await connection.execute(
                `INSERT INTO user_roles_backup 
                 (user_id, guild_id, has_premium, has_warranty, code_linked, warranty_expires_at) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [data.user_id, data.guild_id, data.has_premium, data.has_warranty, data.code_linked, data.warranty_expires_at]
            );
            
            return result.insertId;
    }

    /**
     * Récupérer les garanties actives
     */
    async getActiveWarranties(guildId) {
        const connection = await this.getConnection();
            console.log(`[WarrantyDAO] Recherche des garanties actives pour le serveur: ${guildId}`);
            
            const [rows] = await connection.execute(
                `SELECT wpc.id as warranty_id, wpc.user_id, wpc.warranty_expires_at, wpc.code
                 FROM warranty_premium_codes wpc 
                 WHERE wpc.warranty_activated = TRUE 
                 AND wpc.warranty_expires_at > NOW()`
            );
            
            console.log(`[WarrantyDAO] Trouvé ${rows.length} garanties actives`);
            return rows;
    }

    /**
     * Logger une action de garantie
     */
    async logWarrantyAction(actionData) {
        const connection = await this.getConnection();
        try {
            await connection.execute(
                `INSERT INTO warranty_activation_logs 
                 (user_id, admin_id, code_id, action_type, duration_days, action_details) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    actionData.user_id,
                    actionData.performed_by || actionData.admin_id,
                    actionData.warranty_id || actionData.code_id,
                    actionData.action_type,
                    actionData.duration_days || null,
                    actionData.action_details || null
                ]
            );
            
            console.log(`\x1b[38;5;2m✅ Action de garantie loggée: ${actionData.action_type}\x1b[0m`);
            return true;
        } catch (error) {
            console.error(`\x1b[38;5;1m❌ Erreur lors du logging de l'action de garantie: ${error.message}\x1b[0m`);
            return false;
        }
    }
}

module.exports = WarrantyDAO;
