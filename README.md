# 🎫 MicroCoaster™ Discord Bot

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord)](https://discord.js.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-00758f?style=for-the-badge&logo=mysql)](https://mysql.com/)
[![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)](LICENSE)

<div align="center">
  <h2>🏭 MicroCoaster™ Support & Warranty Management Bot</h2>
  <p><em>Automated warranty activation, customer support, and moderation system for MicroCoaster™ Discord server</em></p>
</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Commands](#-commands)
- [Database Schema](#-database-schema)
- [Contributing](#-contributing)
- [Support](#-support)

## 🌟 Overview

MicroCoaster™ Bot is a comprehensive Discord bot designed specifically for managing warranty activations, customer support tickets, and community moderation for MicroCoaster™ 3D printed products. The bot provides a seamless experience for customers to activate their premium codes and for staff to manage warranties and support requests.

### Key Features

- **🎫 Two-Step Warranty System**: Customers activate codes, admins activate warranties
- **🎧 Advanced Ticket System**: Multiple support categories with automatic team routing
- **🔄 Automatic Role Management**: Persistent role restoration when users rejoin
- **⏰ Smart Reminders**: Automated warranty expiration notifications
- **📊 Comprehensive Logging**: Full audit trail of all actions
- **🌐 Multi-Language Ready**: English user interface, French code documentation

## ✨ Features

### Warranty Management

- 📦 **Code Activation**: Users can activate premium codes through interactive interface
- 🛡️ **Warranty Activation**: Admin-controlled warranty activation system
- ⏱️ **Automatic Reminders**: 30-day and 7-day expiration warnings
- 🔄 **Role Persistence**: Automatic role restoration on server rejoin
- 📈 **Extensions & Management**: Admin tools for warranty extension and management

### Support System

- 🎫 **Multi-Category Tickets**: Technical, Product, Business, and Recruitment support
- 🏷️ **Smart Organization**: Automatic ticket categorization and numbering
- 👥 **Team Routing**: Automatic staff notifications based on ticket type
- 📝 **Rich Templates**: Pre-configured response templates and guidance

### Moderation & Automation

- 🤖 **Automated Role Management**: Smart role assignment and restoration
- 🔍 **Integrity Checks**: Startup verification of user roles and warranties
- 📅 **Scheduled Tasks**: Daily cleanup and reminder processing
- 📊 **Analytics Ready**: Comprehensive logging for analytics and reporting

## 🚀 Installation

### Prerequisites

- Node.js 18+ installed
- MySQL 8.0+ database server
- Discord Bot Token and Application
- Discord Server with appropriate permissions

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd Microcoaster-bot
npm install
```

### Step 2: Database Setup

1. Create a MySQL database:

```sql
CREATE DATABASE microcoaster_bot;
CREATE USER 'bot_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON microcoaster_bot.* TO 'bot_user'@'localhost';
FLUSH PRIVILEGES;
```

2. Import the database schema:

```bash
mysql -u bot_user -p microcoaster_bot < sql/microcoaster_tables.sql
```

### Step 3: Environment Configuration

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:

```env
TOKEN=your_discord_bot_token
ID=your_discord_bot_client_id
GUILD_ID=your_discord_server_id

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=bot_user
MYSQL_PASSWORD=your_secure_password
MYSQL_DATABASE=microcoaster_bot

NODE_ENV=production
LOG_LEVEL=info
```

### Step 4: Automated Server Setup

🎉 **NEW!** The bot now includes a complete automated setup command:

```bash
npm start
```

Once the bot is running and invited to your server with Administrator permissions, use:

```
/setup-bot
```

This single command will automatically:

- ✅ Create all required roles with proper colors and permissions
- ✅ Create all support categories (Technical, Product, Business, Recruitment)
- ✅ Create all necessary channels (warranty, support, logs, stats)
- ✅ Configure channel permissions appropriately
- ✅ Install the ticket system with interactive buttons
- ✅ Save all IDs to configuration automatically
- ✅ Provide a complete setup summary

**Alternative Manual Setup** (if you prefer manual configuration):

### Step 4b: Manual Discord Configuration (Optional)

1. Update `config/config.json` with your Discord IDs:
   - Role IDs (Premium, Warranty, Admin, Support teams)
   - Channel IDs (warranty activation, support, logs)
   - Category IDs (for ticket organization)

2. Create the required Discord roles manually:
   - `🎖️ Premium` - For users with activated codes
   - `🛡️ Warranty Active` - For users with active warranties
   - `👑 Admin` - For administrators
   - `🛠️ Support Team` - For support staff
   - Additional team roles as needed

### Step 5: Bot Ready!

After using `/setup-bot`, your server is completely ready! The bot will display a confirmation message showing all created elements.

**Quick Test:**

1. Go to the 🎫-support channel
2. Click one of the ticket creation buttons
3. Verify the ticket system works correctly

## 🎯 Quick Start Guide

For servers wanting immediate deployment:

1. **Deploy**: `npm start`
2. **Invite**: Add bot to server with Administrator permissions
3. **Setup**: Run `/setup-bot` in any channel
4. **Configure**: Use `/config` to adjust any settings
5. **Test**: Create a ticket in the support channel
6. **Assign**: Give team roles to your staff members

**Total setup time: < 5 minutes!**

## ⚙️ Configuration

### config.json Structure

```json
{
  "guild_id": "YOUR_GUILD_ID",
  "premium_role_id": "PREMIUM_ROLE_ID",
  "warranty_role_id": "WARRANTY_ROLE_ID",
  "admin_role_id": "ADMIN_ROLE_ID",
  "support_team_role_id": "SUPPORT_TEAM_ROLE_ID"
  // ... additional configuration
}
```

### Creating Test Data

Initialize test warranty codes:

```bash
node utils/initTestCodes.js
```

This creates several test codes:

- `MC-TEST-001` through `MC-TRIAL-005`

## 🎮 Usage

### For Administrators

1. **Setup Warranty System**:

   ```
   /setup-warranty
   ```

   Creates the warranty activation interface in the current channel.

2. **Setup Support System**:

   ```
   /setup-tickets
   ```

   Creates the ticket system interface with category buttons.

3. **Warranty Management**:
   ```
   /activate-warranty <code>
   /warranty-extend <user> <months>
   /warranty-check <user>
   /list-pending-warranties
   ```

### For Users

1. **Activate Premium Code**:
   - Click the "Activate my code" button in warranty channel
   - Enter your premium code in the modal
   - Receive Premium role automatically

2. **Create Support Ticket**:
   - Click appropriate support category button
   - Private ticket channel is created automatically
   - Support team is notified

## 📚 Commands

### Setup & Configuration Commands

| Command        | Description                            | Usage                         | Required Permissions |
| -------------- | -------------------------------------- | ----------------------------- | -------------------- |
| `/setup-bot`   | **🆕 Complete automated server setup** | `/setup-bot [overwrite:true]` | Administrator        |
| `/config`      | Modify bot configuration dynamically   | `/config`                     | Administrator        |
| `/config-view` | View current bot configuration         | `/config-view`                | Administrator        |

### Admin Commands

| Command                    | Description                      | Usage                            | Required Permissions |
| -------------------------- | -------------------------------- | -------------------------------- | -------------------- |
| `/setup-warranty`          | Setup warranty activation system | `/setup-warranty`                | Manage Channels      |
| `/activate-warranty`       | Activate warranty for a code     | `/activate-warranty MC-CODE-123` | Admin Role           |
| `/warranty-check`          | Check user warranty status       | `/warranty-check @user`          | Admin Role           |
| `/warranty-extend`         | Extend user warranty             | `/warranty-extend @user 6`       | Admin Role           |
| `/force-restore-roles`     | Force restore user roles         | `/force-restore-roles @user`     | Admin Role           |
| `/list-pending-warranties` | List pending warranty codes      | `/list-pending-warranties`       | Admin Role           |

### User Commands

| Action        | Description                  | How To                                   |
| ------------- | ---------------------------- | ---------------------------------------- |
| Activate Code | Link premium code to account | Click "Activate my code" button          |
| Create Ticket | Open support ticket          | Click category button in support channel |

### 🎯 Featured: `/setup-bot` Command

The `/setup-bot` command is the **fastest way to deploy** the MicroCoaster™ bot:

**What it creates automatically:**

- ✅ **7 Roles**: Premium, Warranty, Admin, and team roles with proper colors
- ✅ **4 Categories**: Technical, Product, Business, and Recruitment support
- ✅ **5 Channels**: Warranty, support, and various log channels
- ✅ **Permissions**: Configured appropriately for each role and channel
- ✅ **Ticket System**: Fully functional with interactive buttons
- ✅ **Configuration**: All IDs saved automatically to config.json

**Usage:**

```
/setup-bot                    # Create all elements (skip existing)
/setup-bot overwrite:true     # Recreate everything (overwrite existing)
```

**Time to complete setup: < 1 minute!**

> 📖 **Detailed Guide**: See [SETUP_BOT_GUIDE.md](SETUP_BOT_GUIDE.md) for complete documentation

## 🗄️ Database Schema

### Key Tables

- **`warranty_premium_codes`**: Stores all warranty/premium codes
- **`user_roles_backup`**: Backup of user roles for persistence
- **`support_tickets`**: Support ticket management
- **`warranty_activation_logs`**: Audit trail of warranty actions
- **`role_restoration_logs`**: Role restoration history

For complete schema, see: `sql/microcoaster_tables.sql`

## � Features in Detail

### Two-Step Warranty Process

1. **User Code Activation**: Users enter their premium code and receive Premium role
2. **Admin Warranty Activation**: Admins activate the warranty, granting Warranty role

### Automated Role Management

- **Startup Verification**: Checks all user roles on bot startup
- **Rejoin Restoration**: Automatically restores roles when users rejoin
- **Expiration Handling**: Removes expired warranty roles automatically

### Smart Reminder System

- **30-day Warning**: Sent when warranty has 30 days remaining
- **7-day Final Notice**: Final warning before expiration
- **Automatic Cleanup**: Removes expired warranty roles

### Comprehensive Logging

All actions are logged with:

- User ID and action details
- Timestamps and performed by information
- Full audit trail for compliance

## 🤝 Contributing

This bot is designed specifically for MicroCoaster™. For customization or contributions:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For technical support:

- Create an issue in this repository
- Contact the development team
- Check the `CDC_FR.md` or `CDC_EN.md` for detailed specifications

## 📄 License

This project is proprietary software for MicroCoaster™. All rights reserved.

---

<div align="center">
  <p><strong>🏭 Built with ❤️ for MicroCoaster™</strong></p>
  <p><em>Professional warranty management and customer support automation</em></p>
</div>
- 🔧 **Configuration modulaire**
- 🎨 **Code formaté** avec ESLint et Prettier

> [!NOTE]
> Ce template utilise Discord.js v14 et les dernières fonctionnalités de Discord. Parfait pour apprendre ou créer rapidement un bot professionnel !

> [!TIP]
> La structure modulaire vous permet d'ajouter facilement de nouvelles fonctionnalités sans casser l'existant.

## 📖 Table des matières

- [🚀 Installation rapide](#-installation-rapide)
- [⚙️ Configuration](#️-configuration)
- [📁 Structure du projet](#-structure-du-projet)
- [🎮 Commandes d'exemple](#-commandes-dexemple)
- [🗃️ Base de données](#️-base-de-données)
- [🔧 Scripts disponibles](#-scripts-disponibles)
- [📏 Qualité du code](#-qualité-du-code)
- [🤝 Contribution](#-contribution)
- [📜 Licence](#-licence)

---

## 🚀 Installation rapide

```bash
# Cloner le repository
git clone https://github.com/yamakajump/discord-bot-template.git
cd discord-bot-template

# Installer les dépendances
npm install

# Créer le fichier de configuration
cp .env.example .env
# Éditer le .env avec vos tokens

# Lancer le bot
npm start
```

---

## ⚙️ Configuration

### Prérequis

- **Node.js** v16.0.0 ou plus récent
- **MySQL** (ou base de données compatible)
- **Token Discord Bot** ([Guide de création](https://discord.com/developers/applications))

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Token de votre bot Discord
TOKEN=votre_token_discord

# ID de votre application Discord
ID=votre_client_id

# Configuration base de données (optionnel)
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=votre_mot_de_passe
MYSQL_DATABASE=discord_bot
```

> **💡 Astuce :** Un fichier `.env.example` est fourni comme modèle.

---

## 📁 Structure du projet

Le projet est organisé de manière modulaire pour faciliter le développement et la maintenance :

```
discord-bot-template/
├── commands/           # Commandes slash du bot
│   ├── exemple1.js        # Exemple avec sous-commandes
│   ├── exemple2.js        # Exemple simple
│   ├── ping.js           # Test de latence
│   ├── help.js           # Aide
│   ├── user.js           # Infos utilisateur
│   ├── button-example.js # Exemple avec boutons
│   ├── modal-example.js  # Exemple avec modal
│   ├── bouton-exemple.js # Démo boutons interactifs
│   └── bdd-exemple.js    # Exemple base de données
├── events/             # Gestionnaires d'événements Discord
│   ├── ready.js          # Bot prêt
│   └── interactionCreate.js # Gestion des interactions
├── buttons/            # Gestionnaires de boutons
│   └── exemple.js        # Exemple de bouton
├── modals/             # Gestionnaires de modals
├── dao/                # Data Access Objects
│   └── exempleDAO.js     # Exemple d'accès BDD
├── sql/                # Scripts de base de données
│   └── init_tables.sql   # Création des tables
├── utils/              # Utilitaires
├── config/             # Configuration
└── index.js            # Point d'entrée principal
```

### 📂 Dossiers principaux

- **`commands/`** : Toutes les commandes slash organisées par fonctionnalité
- **`events/`** : Gestionnaires d'événements Discord (messages, interactions, etc.)
- **`buttons/`** : Logique des boutons interactifs
- **`modals/`** : Gestion des formulaires (modals)
- **`dao/`** : Couche d'accès aux données pour la base de données
- **`sql/`** : Scripts SQL pour l'initialisation et les migrations
- **`utils/`** : Fonctions utilitaires réutilisables

---

## 🎮 Commandes d'exemple

Le template inclut plusieurs commandes prêtes à l'emploi :

### Commandes de base

- `/ping` - Teste la latence du bot
- `/help` - Affiche l'aide avec la liste des commandes
- `/user [utilisateur]` - Affiche les infos d'un utilisateur

### Commandes avancées

- `/exemple1` - Démontre les sous-commandes et groupes
  - `/exemple1 info [type]` - Informations diverses
  - `/exemple1 test [message]` - Commande de test
  - `/exemple1 utilisateur profil [user]` - Profil utilisateur
  - `/exemple1 utilisateur avatar [user]` - Avatar utilisateur
  - `/exemple1 moderation warn <user> [raison]` - Avertissement
  - `/exemple1 moderation kick <user> [raison]` - Expulsion

### Commandes interactives

- `/button-example` - Démontre l'utilisation de boutons
- `/bouton-exemple` - Boutons interactifs avec actions
- `/modal-example` - Ouvre un formulaire (modal)

### Commandes base de données

- `/bdd-exemple profil [utilisateur]` - Profil avec statistiques
- `/bdd-exemple classement [limite]` - Top utilisateurs
- `/bdd-exemple xp <quantité>` - Ajouter de l'expérience
- `/bdd-exemple stats` - Statistiques personnelles

---

## 🗃️ Base de données

Le template inclut un système complet de base de données avec :

### Tables d'exemple

- **`users`** : Utilisateurs avec niveau, expérience, coins
- **`user_stats`** : Statistiques détaillées d'utilisation
- **`activity_logs`** : Journalisation des activités

### Fonctionnalités BDD

- ✅ **DAO modulaires** pour chaque table
- ✅ **Système d'expérience** et de niveaux automatique
- ✅ **Classements** par niveau et XP
- ✅ **Logs d'activité** automatiques
- ✅ **Économie virtuelle** avec coins
- ✅ **Statistiques** de commandes et temps

### Initialisation

```bash
# Les tables se créent automatiquement au premier lancement
npm start

# Ou manuellement via le script SQL
mysql -u root -p votre_database < sql/init_tables.sql
```

---

## 🔧 Scripts disponibles

Le template inclut plusieurs scripts NPM pour faciliter le développement :

### Scripts de base

```bash
# Lancer le bot en production
npm start

# Mode développement (identique à start)
npm run dev

# Aide pour la configuration initiale
npm run setup
```

### Scripts de qualité de code

```bash
# Vérifier le code avec ESLint
npm run lint

# Corriger automatiquement les erreurs ESLint
npm run lint:fix

# Formater le code avec Prettier
npm run prettier
```

---

## 🛠️ Initialisation du projet

### Installation complète

Voici les étapes détaillées pour initialiser votre bot Discord :

```bash
# 1. Cloner le repository
git clone https://github.com/yamakajump/discord-bot-template.git
cd discord-bot-template

# 2. Installer toutes les dépendances
npm install

# 3. Créer le fichier de configuration (si pas déjà fait)
npm run setup

# 4. Configurer votre fichier .env
# Copiez .env.example vers .env et remplissez vos tokens
cp .env.example .env
nano .env  # ou votre éditeur préféré

# 5. (Optionnel) Initialiser la base de données
# Les tables se créent automatiquement au premier lancement
# Ou manuellement : mysql -u root -p votre_database < sql/init_tables.sql

# 6. Vérifier que tout fonctionne
npm run lint
npm run prettier

# 7. Lancer le bot
npm start
```

### Configuration des tokens Discord

1. **Créer une application Discord** :
   - Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
   - Cliquez "New Application" et donnez un nom à votre bot
   - Dans l'onglet "Bot", cliquez "Add Bot"

2. **Récupérer vos tokens** :
   - **TOKEN** : Dans l'onglet "Bot", copiez le token
   - **ID** : Dans l'onglet "General Information", copiez l'Application ID

3. **Inviter le bot** :
   - Dans l'onglet "OAuth2 > URL Generator"
   - Sélectionnez "bot" et "applications.commands"
   - Ajoutez les permissions nécessaires
   - Utilisez l'URL générée pour inviter votre bot

### Première exécution

```bash
# Le bot va automatiquement :
# - Créer les tables de base de données (si configurées)
# - Enregistrer les commandes slash sur Discord
# - Se connecter et afficher "Bot prêt !"

npm start
```

---

## 📏 Qualité du code et outils de développement

Ce template inclut des outils modernes pour maintenir un code de qualité professionnelle.

### 🔍 ESLint - Analyse statique du code

**À quoi ça sert :**

- Détecte les erreurs de syntaxe et les bugs potentiels
- Applique des règles de style cohérentes
- Améliore la lisibilité et la maintenabilité du code
- Évite les erreurs courantes en JavaScript

**Comment l'utiliser :**

```bash
# Analyser tout le projet
npm run lint

# Voir les erreurs en détail
npm run lint -- --verbose

# Corriger automatiquement les erreurs réparables
npm run lint:fix

# Analyser un fichier spécifique
npx eslint commands/exemple1.js
```

**Exemple de sortie :**

```
✨ ESLint vérifie votre code...

commands/exemple1.js
  12:5  error  'unusedVar' is assigned a value but never used  no-unused-vars
  25:1  error  Missing semicolon                               semi

✖ 2 problems (2 errors, 0 warnings)
  1 error potentially fixable with the --fix option.
```

### 🎨 Prettier - Formatage automatique

**À quoi ça sert :**

- Formate automatiquement le code selon des règles cohérentes
- Élimine les débats sur le style de code dans l'équipe
- Assure une présentation uniforme dans tout le projet
- Supporte JSON, Markdown, et autres formats

**Comment l'utiliser :**

```bash
# Formater tout le projet
npm run prettier

# Formater des fichiers spécifiques
npx prettier --write "commands/*.js"

# Vérifier le formatage sans modifier
npx prettier --check "**/*.{js,json,md}"

# Formater un seul fichier
npx prettier --write index.js
```

**Configuration :**
Le projet utilise une configuration Prettier optimisée pour JavaScript. Vous pouvez la personnaliser en créant un fichier `.prettierrc` :

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2
}
```

### 🔄 Workflow recommandé

**Avant de committer :**

```bash
# 1. Formater le code
npm run prettier

# 2. Vérifier et corriger les erreurs
npm run lint:fix

# 3. Vérifier qu'il n'y a plus d'erreurs
npm run lint

# 4. Tester le bot
npm start
```

**Intégration avec votre éditeur :**

- **VS Code** : Installez les extensions ESLint et Prettier
- **WebStorm** : ESLint et Prettier sont intégrés par défaut
- **Vim/Neovim** : Utilisez des plugins comme ALE ou CoC

### ⚙️ Configuration avancée

**Ignorer des fichiers :**
Créez `.eslintignore` et `.prettierignore` :

```
node_modules/
*.min.js
dist/
```

**Règles ESLint personnalisées :**
Modifiez `eslint.config.mjs` pour ajuster les règles :

```javascript
export default [
  // ...existing config...
  {
    rules: {
      "no-console": "warn", // Permettre console.log en dev
      "no-unused-vars": "error",
      // Vos règles personnalisées
    },
  },
];
```

### Conventions

- **Noms de fichiers** : camelCase pour les fichiers, kebab-case pour les dossiers
- **Fonctions** : Documentation JSDoc pour les fonctions importantes
- **Structure** : Un fichier par commande/événement/bouton
- **Base de données** : Un DAO par table avec fonctions CRUD

---

## 🎯 Exemples d'utilisation

### Créer une nouvelle commande

```javascript
// commands/ma-commande.js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ma-commande")
    .setDescription("Description de ma commande"),

  async execute(interaction) {
    await interaction.reply("Hello World!");
  },
};
```

### Ajouter un bouton

```javascript
// buttons/mon-bouton.js
module.exports = {
  async execute(interaction, params) {
    await interaction.reply("Bouton cliqué !");
  },
};
```

### Utiliser la base de données

```javascript
const exempleDAO = require("../dao/exempleDAO");

// Créer un utilisateur
await exempleDAO.createUser(userId, username);

// Ajouter de l'expérience
const result = await exempleDAO.addExperience(userId, 100);
if (result.levelUp) {
  console.log(`Level up ! Nouveau niveau : ${result.newLevel}`);
}
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. **Fork** le projet
2. Créez votre branche feature (`git checkout -b feature/AmazingFeature`)
3. Commitez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une **Pull Request**

### Règles de contribution

- Respectez le style de code existant
- Ajoutez des tests si nécessaire
- Documentez les nouvelles fonctionnalités
- Utilisez des messages de commit clairs

---

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">
  <p><a href="#-discord-bot-template">⬆️ Retour en haut</a></p>
</div>
