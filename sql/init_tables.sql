-- ⚠️ ATTENTION ⚠️ 
-- Script de développement - Recrée les tables à chaque lancement
-- Tables d'exemple pour template Discord Bot

-- Supprimer les tables dans le bon ordre (contraintes de clés étrangères)
DROP TABLE IF EXISTS ticket_transcriptions;
DROP TABLE IF EXISTS ticket_counter;
DROP TABLE IF EXISTS warranty_activation_logs;
DROP TABLE IF EXISTS role_restoration_logs;
DROP TABLE IF EXISTS user_bans;
DROP TABLE IF EXISTS user_status;
DROP TABLE IF EXISTS moderation_logs;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS user_roles_backup;
DROP TABLE IF EXISTS warranty_premium_codes;

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
    user_id VARCHAR(20) NOT NULL UNIQUE,
    has_premium BOOLEAN DEFAULT FALSE,
    has_warranty BOOLEAN DEFAULT FALSE,
    code_linked BOOLEAN DEFAULT FALSE,
    warranty_expires_at TIMESTAMP NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Table pour stocker les logs de modération
-- ✂️ SYSTÈME SIMPLIFIÉ : Plus de points, juste l'historique des sanctions
CREATE TABLE IF NOT EXISTS moderation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NULL,
    action_type ENUM('WARN', 'MUTE', 'KICK', 'BAN', 'UNBAN', 'RESET_HISTORY', 'DISCORD_LINK_REMOVED') NOT NULL,
    reason TEXT NULL,
    duration BIGINT NULL,
    message_content TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour stocker le statut des utilisateurs (sans points, juste le statut de ban)
-- ✂️ SYSTÈME SIMPLIFIÉ : Plus de points, juste l'historique des sanctions dans moderation_logs
CREATE TABLE IF NOT EXISTS user_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL UNIQUE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table pour stocker les bans temporaires
CREATE TABLE IF NOT EXISTS user_bans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    user_id VARCHAR(20) NULL,
    admin_id VARCHAR(20) NOT NULL,
    code_id INT NOT NULL,
    action_type ENUM('ACTIVATE', 'EXTEND', 'DEACTIVATE', 'CODE_LINKED', 'ROLES_RESTORED') NOT NULL,
    duration_days INT NULL,
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

-- 🧪 CODES DE TEST POUR LE DÉVELOPPEMENT 🧪
-- Insertion des codes de test (ils seront recréés à chaque lancement)
INSERT INTO warranty_premium_codes (code, product_info, created_at) VALUES 
('1234567890', 'Code de test 1 - MicroCoaster Premium', NOW()),
('0987654321', 'Code de test 2 - MicroCoaster Premium', NOW()),
('0123456789', 'Code de test 3 - MicroCoaster Premium', NOW()),
('TEST123', 'Code de test 4 - MicroCoaster Premium TEST123', NOW());

-- Codes de test pour les codes en attente (liés mais pas activés)
INSERT INTO warranty_premium_codes (code, product_info, user_id, is_used, linked_at, created_at) VALUES 
('PENDING001', 'MicroCoaster Premium - Pending Test 1', '123456789012345678', TRUE, NOW(), NOW()),
('PENDING002', 'MicroCoaster Premium - Pending Test 2', '987654321098765432', TRUE, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
('PENDING003', 'MicroCoaster Premium - Pending Test 3', NULL, TRUE, NULL, DATE_SUB(NOW(), INTERVAL 5 DAY));

-- Index pour optimiser les performances (syntaxe compatible MySQL 8.4+)
CREATE INDEX idx_warranty_codes_user ON warranty_premium_codes(user_id);
CREATE INDEX idx_warranty_codes_code ON warranty_premium_codes(code);
CREATE INDEX idx_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_moderation_user ON moderation_logs(user_id);
CREATE INDEX idx_user_status_user ON user_status(user_id);
CREATE INDEX idx_user_bans_expires ON user_bans(expires_at);
CREATE INDEX idx_transcriptions_ticket ON ticket_transcriptions(ticket_id);
CREATE INDEX idx_moderation_logs_created_at ON moderation_logs(created_at);
