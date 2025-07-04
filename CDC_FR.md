# 📋 **Cahier des Charges - Bot Discord MicroCoaster™**

---

## 📖 **Table des matières**

1. [Présentation du projet](#-présentation-du-projet)
2. [Objectifs](#-objectifs)
3. [Architecture technique](#️-architecture-technique)
4. [Fonctionnalités détaillées](#️-fonctionnalités-détaillées)
5. [Base de données](#-base-de-données)
6. [Configuration et permissions](#-configuration-et-permissions)
7. [Notes techniques](#-notes-techniques)

---

## 🧮 **Présentation du projet**

**MicroCoaster™** est un bot Discord développé pour gérer et automatiser les services d'une entreprise de vente de microcoasters imprimés en 3D. Le bot facilite l'activation des garanties produits avec statut premium, le support client et la modération du serveur Discord.

### **Contexte**
- **Entreprise** : MicroCoaster™ (vente de microcoasters imprimés en 3D)
- **Plateforme** : Discord
- **Technologies** : Node.js, Discord.js v14, MYSQL
- **Public cible** : Clients de l'entreprise, staff, modérateurs
- **⚠️ Langue importante** : Le code source est en français, mais **toutes les interfaces utilisateur (boutons, messages, embeds) doivent être en anglais** car le serveur Discord cible une audience anglophone

---

## 🎯 **Objectifs**

### **Objectifs principaux**
- Automatiser l'activation des garanties avec statut premium
- Fournir un système de support client efficace
- Maintenir un environnement Discord sain et modéré
- Simplifier la gestion administrative pour le staff

### **Objectifs secondaires**
- Améliorer l'expérience client
- Réduire la charge de travail manuelle du staff
- Créer un système de logs complet pour le suivi
- Permettre une évolutivité future du système

---

## 🏗️ **Architecture technique**

### **Technologies utilisées**
- **Runtime** : Node.js (version 18+)
- **Framework Discord** : Discord.js v14
- **Base de données** : MYSQL
- **Authentification** : Tokens Discord Bot
- **Hébergement** : Hébergement personnel

### **Structure du projet**
```
Microcoaster-bot/
├── index.js              # Point d'entrée principal
├── config/
│   └── config.json       # Configuration du bot
├── commands/             # Commandes slash du bot
├── buttons/              # Gestionnaires de boutons
├── modals/               # Gestionnaires de modales
├── events/               # Événements Discord
├── dao/                  # Accès aux données (Data Access Objects)
├── utils/                # Utilitaires et helpers
└── sql/                  # Scripts de base de données
```

---

## ⚙️ **Fonctionnalités détaillées**

### 📦 **Module d'activation de codes et gestion de garanties**

**Salon** : `#📦・warranty-activation`

#### **Objectif**
Permettre aux clients d'activer leur code premium et aux administrateurs de gérer l'activation des garanties produits.

#### **Spécifications techniques**
- **Commande setup** : `/setup-warranty` (admin uniquement)
- **Commande garantie** : `/activate-warranty <user>` (admin uniquement)
- **Interface utilisateur** : Embed avec bouton d'interaction
- **Modal** : Champ de saisie pour le code
- **Système de rappels** : Tâches programmées (cron jobs)
- **Re-attribution automatique** : Système de persistance des rôles

#### **Fonctionnement détaillé**

##### **Étape 1 : Activation du code par l'utilisateur**

1. **Affichage initial**
   - Embed avec titre : "📦 Premium Code Activation"
   - Description explicative du processus (en anglais)
   - Bouton : `📋 Activate my code`

2. **Processus d'activation utilisateur**
   - Clic sur bouton → Ouverture d'une modale Discord
   - Champ requis :
     - Code premium/garantie (identifiant unique) - Libellé en anglais
   - Validation automatique côté serveur :
     - Code existe en base de données
     - Code non utilisé

3. **Résultats possibles**
   - **Succès** :
     - Attribution automatique du rôle `🎖️ Premium`
     - Liaison du code à l'utilisateur en BDD
     - Message de confirmation avec statut du code (en anglais)
     - **IMPORTANT** : Si la garantie est déjà activée par un admin → Attribution aussi du rôle `🛡️ Garantie Active`
     - Log de l'action
   - **Échec** :
     - Message d'erreur spécifique (en anglais)
     - Limitation des tentatives (3 max par utilisateur/heure)
     - Guidance vers le support si nécessaire (en anglais)

##### **Étape 2 : Activation de la garantie par l'admin**

1. **Commande admin** : `/activate-warranty <user>`
   - Vérification que l'utilisateur a un code lié
   - Activation de la garantie dans la base de données
   - Attribution du rôle `🛡️ Garantie Active` à l'utilisateur
   - Démarrage du décompte de garantie (1 an)
   - Programmation des rappels automatiques

2. **Résultats**
   - **Succès** :
     - L'utilisateur reçoit le rôle `🛡️ Garantie Active`
     - Message de confirmation à l'utilisateur et à l'admin (en anglais)
     - Enregistrement de la date d'activation de garantie
     - Programmation des rappels automatiques
   - **Échec** :
     - Message d'erreur si l'utilisateur n'a pas de code lié (en anglais)
     - Message d'erreur si la garantie est déjà active (en anglais)

#### **Système de rappels automatiques**
- **11 mois après activation garantie** : Premier rappel (MP en anglais)
- **1 semaine avant expiration** : Rappel final (MP + ping optionnel en anglais)
- **Expiration** : Retrait automatique du rôle `🛡️ Garantie Active` (Premium reste)

#### **Système de re-attribution automatique des rôles**
- **Événement déclencheur** : `guildMemberAdd` (utilisateur rejoint le serveur)
- **Vérification** : Contrôle en base de données
  - Si code lié → re-attribution du rôle `🎖️ Premium`
  - Si garantie active → re-attribution aussi du rôle `🛡️ Garantie Active`
- **Notification** : Message de bienvenue personnalisé mentionnant la restauration des rôles (en anglais)
- **Log** : Enregistrement de la re-attribution automatique

#### **Fonctionnalités staff**
- Commande `/activate-warranty <user>` : Activer la garantie pour un utilisateur
- Commande `/warranty-check <user>` : Vérifier le statut complet (code + garantie)
- Commande `/warranty-extend <user> <days>` : Prolonger la garantie
- Commande `/force-restore-roles <user>` : Re-attribuer manuellement les rôles
- Commande `/list-pending-warranties` : Voir les codes liés sans garantie activée
- Dashboard des codes liés et garanties actives

#### **Sécurité**
- Rate limiting : 3 tentatives/heure/utilisateur
- Codes à usage unique
- Logs complets des actions
- Vérification de la validité lors des re-attributions
- Séparation des permissions : utilisateurs peuvent lier, seuls admins activent garanties

---

### ❓ **Système de support par tickets**

**Salon** : `#❓・support`

#### **Objectif**
Fournir un système de support client structuré et efficace avec gestion automatisée des tickets.

#### **Spécifications techniques**
- **Commande** : `/setup-support` (admin uniquement)
- **Catégories dynamiques** : Création automatique de salons privés
- **Permissions** : Gestion automatique des accès
- **Archivage** : Sauvegarde optionnelle des conversations

#### **Types de tickets disponibles**

1. **🛠️ Problème avec un microcoaster**
   - Salon privé avec le client et l'équipe technique
   - Template de questions automatiques (en anglais)
   - Possibilité d'upload d'images

2. **🎮 Problème Discord**
   - Support pour les problèmes liés au serveur
   - Équipe modération automatiquement notifiée
   - FAQ automatique (en anglais)

3. **📨 Candidature staff**
   - Processus de candidature structuré
   - Formulaire automatique via modale (en anglais)
   - Notification des responsables RH

#### **Fonctionnement détaillé**

1. **Création de ticket**
   - Clic sur bouton → Création immédiate du salon privé
   - Format : `ticket-[type]-[username]-[timestamp]`
   - Permissions automatiques : client + staff concerné
   - Message d'accueil personnalisé selon le type

2. **Gestion du ticket**
   - Messages automatiques de guidance (en anglais)
   - Boutons d'action staff :
     - `📌 Mark as Priority`
     - `👤 Assign to Member`
     - `📋 Add Internal Notes`
     - `🔒 Close Ticket`

3. **Fermeture de ticket**
   - Confirmation obligatoire
   - Sauvegarde optionnelle en fichier `.txt`
   - Message de satisfaction client (en anglais)
   - Suppression du salon après 24h

#### **Fonctionnalités avancées**
- **Auto-assignation** : Selon la charge de travail du staff
- **Escalade automatique** : Si pas de réponse sous 24h
- **Statistiques** : Temps de réponse moyen, satisfaction client
- **Templates** : Réponses prédéfinies pour les cas courants

---

### 🛡️ **Système de modération automatisée**

#### **Objectif**
Maintenir un environnement sain, respectueux et sécurisé sur le serveur Discord.

#### **Spécifications techniques**
- **Filtre en temps réel** : Analyse de tous les messages
- **Base de données** : Liste noire de mots/expressions interdits
- **Système de points** : Accumulation de sanctions
- **Logs centralisés** : Salon `#📁・logs-moderation`

#### **Niveaux de sanctions**

##### **Niveau 1 - Avertissement (1-2 points)**
- **Déclencheurs** : Langage légèrement inapproprié, spam mineur
- **Actions** :
  - Suppression automatique du message
  - Avertissement en message privé (en anglais)
  - Log dans le salon de modération

##### **Niveau 2 - Sanctions temporaires (3-5 points)**
- **Déclencheurs** : Récidive, langage plus offensant
- **Actions** :
  - Mute temporaire (10-30 minutes selon les points)
  - Suppression des messages
  - Notification aux modérateurs

##### **Niveau 3 - Sanctions lourdes (6+ points)**
- **Déclencheurs** : Harcèlement, discours de haine, contenu illégal
- **Actions** :
  - Kick ou ban immédiat
  - Suppression de l'historique des messages
  - Alerte prioritaire aux administrateurs

#### **Fonctionnalités avancées**
- **Whitelist** : Exceptions pour certains rôles/utilisateurs
- **Contexte intelligent** : Analyse du contexte pour éviter les faux positifs
- **Appeals system** : Possibilité de contester une sanction
- **Statistiques** : Dashboard des actions de modération

#### **Commandes de modération**
- `/warn <user> <reason>` : Avertissement manuel
- `/mute <user> <duration> <reason>` : Mute temporaire
- `/ban <user> <reason>` : Ban définitif
- `/unban <user>` : Lever un ban
- `/modlogs <user>` : Historique des sanctions
- `/appeal <case_id>` : Contester une sanction

---

## 💾 **Base de données**

### **Structure des tables**

#### **Table `warranty_premium_codes`**
```sql
CREATE TABLE warranty_premium_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
```

#### **Table `user_roles_backup`**
```sql
CREATE TABLE user_roles_backup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20) NOT NULL,
    has_premium BOOLEAN DEFAULT FALSE,
    has_warranty BOOLEAN DEFAULT FALSE,
    code_linked BOOLEAN DEFAULT FALSE,
    warranty_expires_at TIMESTAMP NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

#### **Table `support_tickets`**
```sql
CREATE TABLE support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    type ENUM('coaster', 'discord', 'staff') NOT NULL,
    status ENUM('open', 'assigned', 'resolved', 'closed') DEFAULT 'open',
    assigned_to VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium'
);
```

#### **Table `moderation_logs`**
```sql
CREATE TABLE moderation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NULL,
    action_type VARCHAR(20) NOT NULL,
    reason TEXT NULL,
    duration INTEGER NULL,
    points_added INTEGER DEFAULT 0,
    message_content TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Table `user_points`**
```sql
CREATE TABLE user_points (
    user_id VARCHAR(20) PRIMARY KEY,
    total_points INTEGER DEFAULT 0,
    last_offense TIMESTAMP NULL,
    is_banned BOOLEAN DEFAULT FALSE
);
```

#### **Table `role_restoration_logs`**
```sql
CREATE TABLE role_restoration_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20) NOT NULL,
    roles_restored TEXT NOT NULL,
    restored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trigger_type ENUM('rejoin', 'manual', 'scheduled') NOT NULL
);
```

#### **Table `warranty_activation_logs`**
```sql
CREATE TABLE warranty_activation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20) NOT NULL,
    admin_id VARCHAR(20) NOT NULL,
    code_id INTEGER NOT NULL,
    action_type ENUM('activate', 'extend', 'deactivate') NOT NULL,
    duration_days INTEGER NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (code_id) REFERENCES warranty_premium_codes(id)
);
```

### **Relations**
- Un utilisateur peut avoir un code warranty/premium lié
- Un code peut être activé ou non par un admin
- Un utilisateur a une sauvegarde de rôles dans `user_roles_backup`
- Un ticket appartient à un utilisateur et peut être assigné à un staff
- Les logs de modération sont liés aux utilisateurs
- Les logs de restauration tracent les re-attributions de rôles
- Les logs d'activation tracent les actions des admins sur les garanties

---

## 🔑 **Configuration et permissions**

### **Rôles Discord requis**

#### **Rôles utilisateurs**
- `🎖️ Premium` : Statut premium (attribué automatiquement avec la garantie)
- `🛡️ Garantie Active` : Utilisateurs avec garantie valide
- `🔇 Muted` : Utilisateurs temporairement mutes

#### **Rôles staff**
- `👑 Admin` : Accès complet au bot + activation des garanties
- `🛠️ Modérateur` : Gestion modération et tickets
- `💼 Support` : Gestion des tickets clients uniquement
- `🏭 Technique` : Support technique produits
- `📋 Garantie Manager` : Gestion spécifique des garanties (optionnel)

### **Permissions bot**
```json
{
  "permissions": [
    "SEND_MESSAGES",
    "MANAGE_MESSAGES",
    "MANAGE_CHANNELS",
    "MANAGE_ROLES",
    "BAN_MEMBERS",
    "KICK_MEMBERS",
    "MODERATE_MEMBERS",
    "READ_MESSAGE_HISTORY",
    "EMBED_LINKS",
    "ATTACH_FILES",
    "USE_SLASH_COMMANDS",
    "VIEW_GUILD_INSIGHTS"
  ]
}
```

### **Configuration des salons**

#### **Salons publics**
- `#📦・warranty-activation` : Activation garanties et premium
- `#❓・support` : Création de tickets

#### **Salons staff uniquement**
- `#📁・logs-moderation` : Logs de modération
- `#📊・bot-stats` : Statistiques du bot
- `#⚙️・bot-config` : Configuration administrative
- `#🔄・role-logs` : Logs des re-attributions de rôles

#### **Catégories dynamiques**
- `🎫 TICKETS SUPPORT` : Tickets clients
- `📨 CANDIDATURES` : Candidatures staff

---

## 📝 **Notes techniques**

### **Prérequis**
- Node.js 18+ installé
- Base de données MYSQL
- Serveur Discord avec permissions appropriées
- Token bot Discord valide

### **Variables d'environnement**
```env
DISCORD_TOKEN=your_bot_token
DATABASE_URL=your_database_url
GUILD_ID=your_server_id
LOG_LEVEL=info
NODE_ENV=production
```

### **Commandes de démarrage**
```bash
npm install
npm start
```

### **Événements Discord critiques**
- `guildMemberAdd` : Re-attribution automatique des rôles
- `guildMemberRemove` : Sauvegarde des rôles avant départ
- `ready` : Vérification de l'intégrité des rôles au démarrage

---

*Document créé le 4 juillet 2025 - Version 2.0*  
*Auteur : Yamakajump™*
