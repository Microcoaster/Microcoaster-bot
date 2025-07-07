/**
 * Module d'initialisation de la base de données
 *
 * Ce module configure un pool de connexions MySQL en utilisant mysql2,
 * lit un script SQL d'initialisation et l'exécute pour créer les tables nécessaires.
 */

const mysql = require("mysql2/promise");
const path = require("path");

// Affichage des variables d'environnement utilisées pour la connexion
console.log(
  "\x1b[38;5;4m🔍  Tentative de connexion MySQL avec les paramètres suivants :\x1b[0m",
);
console.log("\x1b[38;5;6mDB_HOST:\x1b[0m", process.env.DB_HOST || "localhost");
console.log("\x1b[38;5;6mDB_PORT:\x1b[0m", process.env.DB_PORT || 3306);
console.log("\x1b[38;5;6mDB_USER:\x1b[0m", process.env.DB_USER || "root");
console.log(
  "\x1b[38;5;6mDB_PASSWORD:\x1b[0m",
  process.env.DB_PASSWORD ? "******" : "password",
);
console.log(
  "\x1b[38;5;6mDB_NAME:\x1b[0m",
  process.env.DB_NAME || "microcoaster_bot",
);

// Création du pool de connexions MySQL avec configuration simple
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "microcoaster_bot",
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  multipleStatements: true,
  charset: "utf8mb4",
  connectTimeout: 300000, // 5 minutes
});

// Gestion des événements du pool
pool.on("connection", function (connection) {
  console.log(
    "\x1b[38;5;6m🔗  Nouvelle connexion MySQL établie (ID: " +
      connection.threadId +
      ")\x1b[0m",
  );
});

pool.on("error", function (err) {
  console.error("\x1b[31m❌  Erreur du pool MySQL:", err.message, "\x1b[0m");
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("\x1b[38;5;3m🔄  Reconnexion automatique en cours...\x1b[0m");
  }
});

// Gestionnaire de connexion centralisé
let sharedConnection = null;

/**
 * Obtenir une connexion partagée à la base de données
 * Crée une nouvelle connexion si nécessaire ou si l'ancienne n'est plus valide
 */
async function getSharedConnection() {
  try {
    // Vérifier si nous avons déjà une connexion valide
    if (sharedConnection) {
      try {
        // Tester la connexion avec une requête simple
        await sharedConnection.execute("SELECT 1");
        return sharedConnection;
      } catch {
        console.log(
          "\x1b[38;5;3m🔄 Connexion expiree, creation d'une nouvelle...\x1b[0m",
        );
        sharedConnection = null;
      }
    }

    // Créer une nouvelle connexion
    console.log(
      "\x1b[38;5;4m🔗 Creation d'une nouvelle connexion partagee...\x1b[0m",
    );
    sharedConnection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "password",
      database: process.env.DB_NAME || "microcoaster_bot",
      charset: "utf8mb4",
      connectTimeout: 300000, // 5 minutes
    });

    console.log("\x1b[38;5;2m✅ Connexion partagee etablie\x1b[0m");
    return sharedConnection;
  } catch (error) {
    console.error(
      `\x1b[38;5;1m❌ Erreur lors de la creation de la connexion partagee: ${error.message}\x1b[0m`,
    );
    throw error;
  }
}

/**
 * Fermer proprement la connexion partagée
 */
async function closeSharedConnection() {
  if (sharedConnection) {
    try {
      await sharedConnection.end();
      console.log("\x1b[38;5;4m🔒 Connexion partagee fermee\x1b[0m");
    } catch (error) {
      console.error(
        `\x1b[38;5;1m❌ Erreur lors de la fermeture: ${error.message}\x1b[0m`,
      );
    } finally {
      sharedConnection = null;
    }
  }
}

/**
 * Fonction d'initialisation de la base de données.
 *
 * Elle lit le fichier SQL d'initialisation (par exemple, pour créer des tables)
 * puis exécute son contenu sur la base de données.
 *
 * @returns {Promise<void>} Une promesse qui se résout une fois le script exécuté.
 */
async function initializeDatabase() {
  // Construction du chemin absolu vers le fichier SQL d'initialisation.
  const initSqlPath = path.join(__dirname, "..", "sql", "init_tables.sql");

  try {
    console.log(
      "\x1b[38;5;4m📂  Lecture du fichier SQL d'initialisation :\x1b[0m",
      initSqlPath,
    );

    // Obtenir la connexion partagée
    const connection = await getSharedConnection();

    // Test de connexion initial avec timeout personnalisé
    console.log(
      "\x1b[38;5;4m🔗  Test de connexion à la base de données...\x1b[0m",
    );
    const startTime = Date.now();

    try {
      // Test de connexion avec timeout étendu de 5 minutes
      const connectionTest = await connection.execute("SELECT 1 as test");
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("connect ETIMEDOUT")), 300000),
      );

      await Promise.race([connectionTest, timeoutPromise]);
      const connectionTime = Date.now() - startTime;
      console.log(
        `\x1b[38;5;2m✅  Connexion établie en ${connectionTime}ms\x1b[0m`,
      );
    } catch (connectionError) {
      console.error(
        `\x1b[38;5;1m❌  Échec de connexion: ${connectionError.message}\x1b[0m`,
      );
      console.log(
        `\x1b[38;5;3m⚠️  Le bot va démarrer en mode sans base de données\x1b[0m`,
      );
      // Ne pas lancer d'erreur, permettre au bot de démarrer
      return;
    }

    // Vérifier que le fichier existe
    const fs = require("fs");
    if (!fs.existsSync(initSqlPath)) {
      throw new Error(`Fichier SQL non trouvé : ${initSqlPath}`);
    }

    // Lecture du fichier SQL en tant que chaîne de caractères.
    const sqlContent = fs.readFileSync(initSqlPath, "utf8");
    console.log("\x1b[38;5;4m📝  Contenu du fichier SQL chargé.\x1b[0m");

    // Nettoyage et parsing amélioré du contenu SQL
    const cleanedContent = sqlContent
      // Supprimer les commentaires sur une ligne
      .replace(/--.*$/gm, "")
      // Supprimer les lignes vides
      .replace(/^\s*\n/gm, "")
      // Supprimer les espaces en début/fin
      .trim();

    // Diviser par point-virgule mais en gardant les requêtes complexes
    const sqlStatements = cleanedContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    console.log(
      `\x1b[38;5;4m🔧  Exécution de ${sqlStatements.length} requêtes SQL...\x1b[0m`,
    );

    // Exécuter chaque requête SQL
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i].trim();
      if (statement) {
        try {
          // Ajouter un point-virgule si manquant
          const finalStatement = statement.endsWith(";")
            ? statement
            : statement + ";";

          console.log(
            `\x1b[38;5;4m🔄  Exécution requête ${i + 1}/${sqlStatements.length}: ${finalStatement.substring(0, 60)}...\x1b[0m`,
          );

          const queryStart = Date.now();
          await connection.execute(finalStatement);
          const queryTime = Date.now() - queryStart;

          console.log(
            `\x1b[38;5;2m✅  Requête ${i + 1} exécutée en ${queryTime}ms\x1b[0m`,
          );
        } catch (sqlError) {
          console.error(`\x1b[38;5;1m❌  Erreur requête ${i + 1}:\x1b[0m`);
          console.error(
            `\x1b[38;5;1m   SQL: ${statement.substring(0, 100)}...\x1b[0m`,
          );
          console.error(`\x1b[38;5;1m   Erreur: ${sqlError.message}\x1b[0m`);

          // Ne pas arrêter pour les erreurs de tables existantes ou d'index
          if (
            sqlError.message.includes("already exists") ||
            sqlError.message.includes("Duplicate key name") ||
            sqlError.message.includes("Duplicate entry")
          ) {
            console.log(
              `\x1b[38;5;3m⚠️   Élément déjà existant, on continue...\x1b[0m`,
            );
            continue;
          } else {
            throw sqlError;
          }
        }
      }
    }

    console.log(
      "\x1b[38;5;2m🗂️  Base de données initialisée avec succès.\x1b[0m",
    );
  } catch (err) {
    // En cas d'erreur, affichage du message d'erreur complet dans la console.
    console.error(
      "\x1b[38;5;1m🗂️   Erreur lors de l'exécution du script SQL :\x1b[0m",
      err,
    );
    throw err;
  }
}

// Exportation des fonctions utiles
module.exports = {
  initializeDatabase,
  getSharedConnection,
  closeSharedConnection,
};
