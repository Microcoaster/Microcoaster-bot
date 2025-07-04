/**
 * Commande d'exemple utilisant la base de données
 * 
 * Cette commande démontre comment utiliser un DAO avec une structure modulaire :
 * - Des sous-commandes simples
 * - Le chargement dynamique des fichiers d'exécution
 * - Utilisation de la base de données
 */

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bdd-exemple")
    .setDescription("Exemples d'utilisation de la base de données")
    
    .addSubcommand(subcommand =>
      subcommand
        .setName("profil")
        .setDescription("Affiche votre profil ou celui d'un autre utilisateur")
        .addUserOption(option =>
          option
            .setName("utilisateur")
            .setDescription("Utilisateur dont voir le profil")
            .setRequired(false)
        )
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName("classement")
        .setDescription("Affiche le classement des utilisateurs")
        .addIntegerOption(option =>
          option
            .setName("limite")
            .setDescription("Nombre d'utilisateurs à afficher (max 20)")
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName("xp")
        .setDescription("Ajoute de l'expérience (commande de test)")
        .addIntegerOption(option =>
          option
            .setName("quantite")
            .setDescription("Quantité d'XP à ajouter")
            .setMinValue(1)
            .setMaxValue(1000)
            .setRequired(true)
        )
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName("stats")
        .setDescription("Affiche les statistiques d'utilisation du bot")
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName("coins")
        .setDescription("Gère les coins (monnaie virtuelle)")
        .addStringOption(option =>
          option
            .setName("action")
            .setDescription("Action à effectuer")
            .setRequired(true)
            .addChoices(
              { name: "Voir mes coins", value: "voir" },
              { name: "Ajouter des coins (admin)", value: "ajouter" },
              { name: "Retirer des coins (admin)", value: "retirer" },
              { name: "Daily coins", value: "daily" }
            )
        )
        .addIntegerOption(option =>
          option
            .setName("quantite")
            .setDescription("Quantité de coins (pour ajouter/retirer)")
            .setMinValue(1)
            .setMaxValue(10000)
            .setRequired(false)
        )
        .addUserOption(option =>
          option
            .setName("utilisateur")
            .setDescription("Utilisateur cible (pour admin)")
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      // Charger le fichier de sous-commande correspondant
      const subcommandFile = require(
        path.join(__dirname, "bdd-exemple", `${subcommand}.js`)
      );
      
      await subcommandFile.execute(interaction);
    } catch (error) {
      console.error(
        `⚠️ Erreur lors de l'exécution de la commande ${subcommand}:`,
        error
      );
      
      await interaction.reply({
        content: `Une erreur est survenue lors de l'exécution de la commande.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
