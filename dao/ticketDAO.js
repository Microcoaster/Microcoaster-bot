const { getSharedConnection } = require('../utils/dbInit');

class TicketDAO {
    constructor() {
        // Plus besoin de configuration de base de données ici
        // Tout est géré par dbInit
    }

    async getConnection() {
        try {
            return await getSharedConnection();
        } catch (error) {
            console.error(`\x1b[38;5;1m❌ Erreur de connexion MySQL: ${error.message}\x1b[0m`);
            throw error;
        }
    }

    /**
     * Générer le prochain numéro de ticket
     */
    async getNextTicketNumber() {
        try {
            const connection = await this.getConnection();
            await connection.execute(
                'UPDATE ticket_counter SET last_ticket_number = last_ticket_number + 1 WHERE id = 1'
            );
            
            const [rows] = await connection.execute(
                'SELECT last_ticket_number FROM ticket_counter WHERE id = 1'
            );
            
            return rows[0].last_ticket_number;
        } catch {
            console.error(`\x1b[38;5;3m⚠️ Impossible d'accéder à la base de données, utilisation d'un numéro temporaire\x1b[0m`);
            // Retourner un numéro basé sur le timestamp pour fonctionner sans DB
            return Math.floor(Date.now() / 1000) % 10000;
        }
    }

    /**
     * Créer un nouveau ticket
     */
    async createTicket(userId, channelId, type, priority = 'medium', ticketNumber = null) {
        try {
            const connection = await this.getConnection();
            // Utiliser le numéro fourni ou en générer un nouveau
            const finalTicketNumber = ticketNumber || await this.getNextTicketNumber();
            const ticketId = `ticket-${finalTicketNumber}`;

            const [result] = await connection.execute(
                'INSERT INTO support_tickets (ticket_id, user_id, channel_id, type, priority) VALUES (?, ?, ?, ?, ?)',
                [ticketId, userId, channelId, type, priority]
            );

            return {
                id: result.insertId,
                ticketId,
                ticketNumber: finalTicketNumber
            };
        } catch (error) {
            console.error(`\x1b[38;5;3m⚠️ Impossible de sauvegarder le ticket en base de données: ${error.message}\x1b[0m`);
            // Retourner des données simulées pour que le ticket fonctionne
            const fallbackNumber = ticketNumber || Math.floor(Date.now() / 1000) % 10000;
            return {
                id: fallbackNumber,
                ticketId: `ticket-${fallbackNumber}`,
                ticketNumber: fallbackNumber
            };
        }
    }

    /**
     * Obtenir un ticket par son ID
     */
    async getTicket(ticketId) {
        const connection = await this.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM support_tickets WHERE ticket_id = ?',
            [ticketId]
        );
        
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Obtenir un ticket par l'ID du salon Discord
     */
    async getTicketByChannelId(channelId) {
        const connection = await this.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM support_tickets WHERE channel_id = ? AND status != "closed"',
            [channelId]
        );
        
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Assigner un ticket à un membre du staff
     */
    async assignTicket(ticketId, staffId) {
        const connection = await this.getConnection();
        const [result] = await connection.execute(
            'UPDATE support_tickets SET assigned_to = ?, status = "assigned" WHERE ticket_id = ?',
            [staffId, ticketId]
        );
        
        return result.affectedRows > 0;
    }

    /**
     * Changer la priorité d'un ticket
     */
    async updateTicketPriority(ticketId, priority) {
        const connection = await this.getConnection();
        const [result] = await connection.execute(
            'UPDATE support_tickets SET priority = ? WHERE ticket_id = ?',
            [priority, ticketId]
        );
        
        return result.affectedRows > 0;
    }

    /**
     * Changer le statut d'un ticket
     */
    async updateTicketStatus(ticketId, status) {
        const connection = await this.getConnection();
        let query = 'UPDATE support_tickets SET status = ?';
        const params = [status];

        if (status === 'closed') {
            query += ', closed_at = NOW()';
        }

        query += ' WHERE ticket_id = ?';
        params.push(ticketId);

        const [result] = await connection.execute(query, params);
        
        return result.affectedRows > 0;
    }

    /**
     * Fermer un ticket
     */
    async closeTicket(ticketId) {
        return await this.updateTicketStatus(ticketId, 'closed');
    }

    /**
     * Obtenir tous les tickets ouverts
     */
    async getOpenTickets() {
        const connection = await this.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM support_tickets WHERE status IN ("open", "assigned") ORDER BY priority DESC, created_at ASC'
        );
        
        return rows;
    }

    /**
     * Obtenir les tickets d'un utilisateur
     */
    async getUserTickets(userId, limit = 10) {
        const connection = await this.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [userId, limit]
        );
        
        return rows;
    }

    /**
     * Vérifier si un utilisateur a déjà un ticket ouvert d'un type donné
     */
    async getUserActiveTicket(userId, guildId, ticketType = null) {
        try {
            const connection = await this.getConnection();
            let query = 'SELECT * FROM support_tickets WHERE user_id = ? AND status != "closed"';
            let params = [userId];
            
            if (ticketType) {
                query += ' AND type = ?';
                params.push(ticketType);
            }
            
            query += ' ORDER BY created_at DESC LIMIT 1';
            
            const [rows] = await connection.execute(query, params);
            
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error(`\x1b[38;5;3m⚠️ Impossible de vérifier les tickets existants: ${error.message}\x1b[0m`);
            // Retourner null pour permettre la création de ticket
            return null;
        }
    }

    /**
     * Obtenir les tickets assignés à un membre du staff
     */
    async getStaffTickets(staffId) {
        const connection = await this.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM support_tickets WHERE assigned_to = ? AND status != "closed" ORDER BY priority DESC, created_at ASC',
            [staffId]
        );
        
        return rows;
    }

    /**
     * Obtenir les statistiques des tickets
     */
    async getTicketStats(days = 30) {
        const connection = await this.getConnection();
        const [totalRows] = await connection.execute(
            'SELECT COUNT(*) as total FROM support_tickets WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
            [days]
        );

        const [statusRows] = await connection.execute(
            'SELECT status, COUNT(*) as count FROM support_tickets WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY status',
            [days]
        );

        const [typeRows] = await connection.execute(
            'SELECT type, COUNT(*) as count FROM support_tickets WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY type',
            [days]
        );

        const [avgResponseRows] = await connection.execute(
            'SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) as avg_response_minutes FROM support_tickets WHERE closed_at IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
            [days]
        );

        return {
            total: totalRows[0].total,
            byStatus: statusRows.reduce((acc, row) => {
                acc[row.status] = row.count;
                return acc;
            }, {}),
            byType: typeRows.reduce((acc, row) => {
                acc[row.type] = row.count;
                return acc;
            }, {}),
            avgResponseMinutes: avgResponseRows[0].avg_response_minutes || 0
        };
    }

    /**
     * Vérifier s'il y a des tickets sans réponse depuis X heures
     */
    async getStaleTickets(hoursWithoutResponse = 24) {
        const connection = await this.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM support_tickets WHERE status = "open" AND created_at <= DATE_SUB(NOW(), INTERVAL ? HOUR)',
            [hoursWithoutResponse]
        );
        
        return rows;
    }

    /**
     * Créer une transcription de ticket
     */
    async createTranscription(ticketId, content, createdBy) {
        const connection = await this.getConnection();
        try {
            await connection.execute(
                'INSERT INTO ticket_transcriptions (ticket_id, content, created_by) VALUES (?, ?, ?)',
                [ticketId, content, createdBy]
            );
            
            console.log(`\x1b[38;5;2m✅ Transcription créée pour le ticket ${ticketId}\x1b[0m`);
            return true;
        } catch (error) {
            console.error(`\x1b[38;5;1m❌ Erreur lors de la création de la transcription: ${error.message}\x1b[0m`);
            return false;
        }
    }

    /**
     * Récupérer la transcription d'un ticket
     */
    async getTranscription(ticketId) {
        const connection = await this.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM ticket_transcriptions WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1',
            [ticketId]
        );
        
        return rows[0] || null;
    }

    /**
     * Récupérer toutes les transcriptions d'un ticket
     */
    async getAllTranscriptions(ticketId) {
        const connection = await this.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM ticket_transcriptions WHERE ticket_id = ? ORDER BY created_at ASC',
            [ticketId]
        );
        
        return rows;
    }

    /**
     * Supprimer un ticket de la base de données (utilisé quand le salon est supprimé)
     */
    async deleteTicket(ticketId) {
        const connection = await this.getConnection();
        try {
            // Supprimer d'abord les transcriptions
            await connection.execute(
                'DELETE FROM ticket_transcriptions WHERE ticket_id = ?',
                [ticketId]
            );
            
            // Puis supprimer le ticket
            const [result] = await connection.execute(
                'DELETE FROM support_tickets WHERE ticket_id = ?',
                [ticketId]
            );
            
            console.log(`\x1b[38;5;3m🗑️  Ticket ${ticketId} supprimé de la base de données\x1b[0m`);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`\x1b[38;5;1m❌ Erreur lors de la suppression du ticket ${ticketId}: ${error.message}\x1b[0m`);
            return false;
        }
    }

    /**
     * Supprimer un ticket par l'ID du salon Discord
     */
    async deleteTicketByChannelId(channelId) {
        const connection = await this.getConnection();
        try {
            // D'abord récupérer le ticket_id
            const [ticketRows] = await connection.execute(
                'SELECT ticket_id FROM support_tickets WHERE channel_id = ?',
                [channelId]
            );
            
            if (ticketRows.length === 0) {
                return false; // Aucun ticket trouvé
            }
            
            const ticketId = ticketRows[0].ticket_id;
            
            // Utiliser la méthode existante pour supprimer
            return await this.deleteTicket(ticketId);
        } catch (error) {
            console.error(`\x1b[38;5;1m❌ Erreur lors de la suppression du ticket par channel ID ${channelId}: ${error.message}\x1b[0m`);
            return false;
        }
    }

    /**
     * Obtenir tous les tickets avec leurs channel_id pour vérification
     */
    async getAllOpenTicketsWithChannels() {
        const connection = await this.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT ticket_id, channel_id, user_id, type, created_at FROM support_tickets WHERE status != "closed"'
            );
            
            return rows;
        } catch (error) {
            console.error(`\x1b[38;5;1m❌ Erreur lors de la récupération des tickets ouverts: ${error.message}\x1b[0m`);
            return [];
        }
    }

    /**
     * Fermer instantanément un ticket et supprimer le salon
     */
    async closeTicketInstantly(ticketId, channelId, guild, reason = 'Fermé par un administrateur') {
        try {
            // Marquer le ticket comme fermé en base
            await this.closeTicket(ticketId);
            
            // Supprimer le salon Discord instantanément
            if (channelId && guild) {
                const channel = guild.channels.cache.get(channelId);
                if (channel) {
                    await channel.delete(reason);
                    console.log(`\x1b[38;5;2m✅ Ticket ${ticketId} fermé instantanément et salon supprimé\x1b[0m`);
                } else {
                    console.log(`\x1b[38;5;3m⚠️  Salon ${channelId} du ticket ${ticketId} déjà supprimé\x1b[0m`);
                }
            }
            
            return true;
        } catch (error) {
            console.error(`\x1b[38;5;1m❌ Erreur lors de la fermeture instantanée du ticket ${ticketId}: ${error.message}\x1b[0m`);
            return false;
        }
    }
}

module.exports = TicketDAO;
