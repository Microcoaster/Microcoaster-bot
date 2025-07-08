/**
 * Gestionnaire de configuration avec rechargement automatique
 *
 * Ce module permet de recharger automatiquement la configuration
 * sans redémarrer le bot quand le fichier config.json est modifié.
 */

const fs = require("fs");
const path = require("path");
const { EventEmitter } = require("events");

class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.configPath = path.join(__dirname, "../config/config.json");
    this.config = null;
    this.watcher = null;
    this.lastModified = null;
    this.debounceTimeout = null;

    // Charger la configuration initiale
    this.loadConfig();

    // Démarrer la surveillance du fichier
    this.startWatching();
  }

  /**
   * Charge la configuration depuis le fichier
   */
  loadConfig() {
    try {
      const stats = fs.statSync(this.configPath);
      const newModified = stats.mtime.getTime();

      // Éviter de recharger si le fichier n'a pas changé
      if (this.lastModified === newModified && this.config) {
        return this.config;
      }

      const configData = fs.readFileSync(this.configPath, "utf8");
      const newConfig = JSON.parse(configData);

      const oldConfig = this.config;
      this.config = newConfig;
      this.lastModified = newModified;

      // Émettre un événement de changement si ce n'est pas le premier chargement
      if (oldConfig) {
        console.log("🔄 Configuration rechargée automatiquement");
        this.emit("configChanged", newConfig, oldConfig);
      } else {
        console.log("📋 Configuration chargée initialement");
        this.emit("configLoaded", newConfig);
      }

      return this.config;
    } catch (error) {
      console.error("❌ Erreur lors du chargement de la configuration:", error);

      // Retourner la dernière configuration valide si disponible
      if (this.config) {
        console.log("⚠️ Utilisation de la dernière configuration valide");
        return this.config;
      }

      throw error;
    }
  }

  /**
   * Démarre la surveillance du fichier de configuration
   */
  startWatching() {
    if (this.watcher) {
      this.stopWatching();
    }

    try {
      this.watcher = fs.watch(this.configPath, (eventType) => {
        if (eventType === "change") {
          // Debounce pour éviter les rechargements multiples
          if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
          }

          this.debounceTimeout = setTimeout(() => {
            this.loadConfig();
          }, 100); // Attendre 100ms après le dernier changement
        }
      });

      console.log("👁️  Surveillance de la configuration activée");
    } catch (error) {
      console.error("❌ Erreur lors du démarrage de la surveillance:", error);
    }
  }

  /**
   * Arrête la surveillance du fichier
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log("👁️  Surveillance de la configuration arrêtée");
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  /**
   * Obtient la configuration actuelle
   */
  getConfig() {
    return this.config || this.loadConfig();
  }

  /**
   * Obtient une valeur spécifique de la configuration
   */
  get(path) {
    const config = this.getConfig();
    const keys = path.split(".");
    let value = config;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Recharge manuellement la configuration
   */
  reload() {
    return this.loadConfig();
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    this.stopWatching();
    this.removeAllListeners();
  }
}

// Instance singleton
let instance = null;

module.exports = {
  /**
   * Obtient l'instance du gestionnaire de configuration
   */
  getInstance() {
    if (!instance) {
      instance = new ConfigManager();
    }
    return instance;
  },

  /**
   * Initialise le gestionnaire avec un client Discord
   */
  init(client) {
    const configManager = this.getInstance();

    // Écouter les changements de configuration
    configManager.on("configChanged", (newConfig, oldConfig) => {
      this.handleConfigChange(client, newConfig, oldConfig);
    });

    return configManager;
  },

  /**
   * Gère les changements de configuration en temps réel
   */
  async handleConfigChange(client, newConfig, oldConfig) {
    try {
      // Mise à jour du statut du bot si nécessaire
      if (
        oldConfig.bot?.status !== newConfig.bot?.status ||
        oldConfig.bot?.activity_type !== newConfig.bot?.activity_type
      ) {
        const status = newConfig.bot?.status || "MicroCoaster™ Support";
        const activityType = newConfig.bot?.activity_type || "WATCHING";

        await client.user.setActivity(status, { type: activityType });
        console.log(`🤖 Statut du bot mis à jour: ${activityType} ${status}`);
      }

      // Autres mises à jour en temps réel peuvent être ajoutées ici

      console.log("✅ Configuration appliquée en temps réel");
    } catch (error) {
      console.error("❌ Erreur lors de l'application des changements:", error);
    }
  },

  /**
   * Obtient la configuration actuelle (raccourci)
   */
  getConfig() {
    return this.getInstance().getConfig();
  },

  /**
   * Obtient une valeur de configuration (raccourci)
   */
  get(path) {
    return this.getInstance().get(path);
  },
};
