-- ⚠️ ATTENTION ⚠️ 
-- Tables d'exemple pour template Discord Bot
-- Ne pas décommenter les lignes DROP TABLE si vous ne savez pas ce que vous faites.

-- DROP TABLE IF EXISTS activity_logs;
-- DROP TABLE IF EXISTS user_stats;
-- DROP TABLE IF EXISTS users;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY, -- ID Discord de l'utilisateur
  username VARCHAR(255) NOT NULL, -- Nom d'utilisateur Discord
  display_name VARCHAR(255), -- Nom d'affichage
  join_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Date d'arrivée sur le bot
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Dernière activité
  level INT NOT NULL DEFAULT 1, -- Niveau de l'utilisateur
  experience INT NOT NULL DEFAULT 0, -- Points d'expérience
  coins INT NOT NULL DEFAULT 100, -- Monnaie du bot
  is_premium BOOLEAN NOT NULL DEFAULT FALSE -- Statut premium
);

-- Table des statistiques utilisateur
CREATE TABLE IF NOT EXISTS user_stats (
  user_id VARCHAR(255) PRIMARY KEY, -- ID de l'utilisateur
  commands_used INT NOT NULL DEFAULT 0, -- Nombre de commandes utilisées
  messages_sent INT NOT NULL DEFAULT 0, -- Nombre de messages envoyés
  time_online INT NOT NULL DEFAULT 0, -- Temps en ligne (en minutes)
  favorite_command VARCHAR(100), -- Commande favorite
  achievements TEXT, -- Succès débloqués (JSON)
  preferences TEXT, -- Préférences utilisateur (JSON)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_stats FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des logs d'activité
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL, -- Type d'action (command, message, etc.)
  details TEXT, -- Détails de l'action
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
