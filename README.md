![Contributors](https://img.shields.io/github/contributors/yamakajump/discord-bot-template.svg?style=for-the-badge)
![Forks](https://img.shields.io/github/forks/yamakajump/discord-bot-template.svg?style=for-the-badge)
![Stargazers](https://img.shields.io/github/stars/yamakajump/discord-bot-template.svg?style=for-the-badge)
![Issues](https://img.shields.io/github/issues/yamakajump/discord-bot-template.svg?style=for-the-badge)
![License](https://img.shields.io/github/license/yamakajump/discord-bot-template.svg?style=for-the-badge)

![JS](https://img.shields.io/badge/JS-20232A?style=for-the-badge&logo=javascript&logoColor=f1c513)
![Discord.js](https://img.shields.io/badge/Discord.js-20232A?style=for-the-badge&logo=discord&logoColor=5865F2)
![Node.js](https://img.shields.io/badge/Node.js-20232A?style=for-the-badge&logo=node.js&logoColor=339933)
![MySQL](https://img.shields.io/badge/MySQL-20232A?style=for-the-badge&logo=mysql&logoColor=00758f)

<div align="center">
  <h1>🤖 Discord Bot Template</h1>
  <p><em>Template complet et moderne pour créer des bots Discord avec Discord.js v14</em></p>
</div>

# 🚀 Discord Bot Template

Bienvenue dans ce template complet pour créer des bots Discord ! Ce projet fournit une structure modulaire et des exemples pour tous les aspects du développement de bots Discord.

## ✨ Fonctionnalités

- 🎯 **Commandes Slash** avec sous-commandes et groupes
- 🔘 **Boutons interactifs** avec gestion des événements
- 📝 **Modals** (formulaires) pour la saisie utilisateur
- 🗃️ **Base de données** MySQL avec exemples de DAO
- 📊 **Système d'expérience** et de niveaux
- 🏆 **Classements** et statistiques
- 🎮 **Système de coins** et progression
- 📝 **Logs d'activité** automatiques
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
      "no-console": "warn",  // Permettre console.log en dev
      "no-unused-vars": "error",
      // Vos règles personnalisées
    }
  }
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
