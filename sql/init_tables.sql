-- ⚠️ ATTENTION ⚠️ 
-- Tables d'exemple pour template Discord Bot
-- Ne pas décommenter les lignes DROP TABLE si vous ne savez pas ce que vous faites.

-- DROP TABLE IF EXISTS ticket_transcriptions;
-- DROP TABLE IF EXISTS ticket_counter;
-- DROP TABLE IF EXISTS warranty_activation_logs;
-- DROP TABLE IF EXISTS role_restoration_logs;
-- DROP TABLE IF EXISTS user_points;
-- DROP TABLE IF EXISTS moderation_logs;
-- DROP TABLE IF EXISTS support_tickets;
-- DROP TABLE IF EXISTS user_roles_backup;
-- DROP TABLE IF EXISTS warranty_premium_codes;

-- Table principale des codes warranty/premium
CREATE TABLE IF NOT EXISTS warranty_premium_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(20) NULL,
    is_used BOOLEAN DEFAULT FALSE,
    linked_at TIMESTAMP NULL,
    warranty_activated BOOLEAN DEFAULT FALSE,
    warranty_activated_by VARCHAR(20) NULL,
    warranty_activated_at TIMESTAMP NULL,
    warranty_expires_at TIMESTAMP NULL,
    product_info TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de sauvegarde des rôles utilisateurs
CREATE TABLE IF NOT EXISTS user_roles_backup (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    has_premium BOOLEAN DEFAULT FALSE,
    has_warranty BOOLEAN DEFAULT FALSE,
    code_linked BOOLEAN DEFAULT FALSE,
    warranty_expires_at TIMESTAMP NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Table des tickets de support
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    type ENUM('ticket_technical', 'ticket_product', 'ticket_business', 'ticket_recruitment') NOT NULL,
    status ENUM('open', 'assigned', 'resolved', 'closed') DEFAULT 'open',
    assigned_to VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium'
);

-- Table des logs de modération
CREATE TABLE IF NOT EXISTS moderation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NULL,
    action_type VARCHAR(20) NOT NULL,
    reason TEXT NULL,
    duration INT NULL,
    points_added INT DEFAULT 0,
    message_content TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des points de modération par utilisateur
CREATE TABLE IF NOT EXISTS user_points (
    user_id VARCHAR(20) PRIMARY KEY,
    total_points INT DEFAULT 0,
    last_offense TIMESTAMP NULL,
    is_banned BOOLEAN DEFAULT FALSE
);

-- Table des logs de restauration de rôles
CREATE TABLE IF NOT EXISTS role_restoration_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    roles_restored TEXT NOT NULL,
    restored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trigger_type ENUM('rejoin', 'manual', 'scheduled') NOT NULL
);

-- Table des logs d'activation de garantie par les admins
CREATE TABLE IF NOT EXISTS warranty_activation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    admin_id VARCHAR(20) NOT NULL,
    code_id INT NOT NULL,
    action_type ENUM('activate', 'extend', 'deactivate') NOT NULL,
    duration_days INT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (code_id) REFERENCES warranty_premium_codes(id)
);

-- Table pour la numérotation automatique des tickets
CREATE TABLE IF NOT EXISTS ticket_counter (
    id INT PRIMARY KEY AUTO_INCREMENT,
    last_ticket_number INT DEFAULT 0
);

-- Table des transcriptions de tickets
CREATE TABLE IF NOT EXISTS ticket_transcriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id VARCHAR(50) NOT NULL,
    content LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(20) NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id)
);

-- Initialiser le compteur de tickets
INSERT IGNORE INTO ticket_counter (id, last_ticket_number) VALUES (1, 0);

-- Index pour optimiser les performances (syntaxe compatible MySQL 8.4+)
CREATE INDEX idx_warranty_codes_user ON warranty_premium_codes(user_id);
CREATE INDEX idx_warranty_codes_code ON warranty_premium_codes(code);
CREATE INDEX idx_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_moderation_user ON moderation_logs(user_id);
CREATE INDEX idx_user_points_user ON user_points(user_id);
CREATE INDEX idx_transcriptions_ticket ON ticket_transcriptions(ticket_id);
