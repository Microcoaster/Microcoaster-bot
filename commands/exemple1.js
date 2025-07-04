/**
 * Exemple de commande slash avec sous-commandes et groupes de sous-commandes
 * 
 * Cette commande démontre comment structurer une commande complexe avec :
 * - Des sous-commandes simples
 * - Des groupes de sous-commandes
 * - Le chargement dynamique des fichiers d'exécution
 */

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("exemple1")
    .setDescription("Exemple de commande avec sous-commandes et groupes.")
    
    // Sous-commande simple : info
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Affiche des informations générales.")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Type d'information à afficher")
            .setRequired(false)
            .addChoices(
              { name: "Bot", value: "bot" },
              { name: "Serveur", value: "server" },
              { name: "Utilisateur", value: "user" }
            )
        )
    )
    
    // Sous-commande simple : test
    .addSubcommand((subcommand) =>
      subcommand
        .setName("test")
        .setDescription("Commande de test simple.")
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Message à tester")
            .setRequired(false)
        )
    )
    
    // Groupe de sous-commandes : utilisateur
    .addSubcommandGroup((group) =>
      group
        .setName("utilisateur")
        .setDescription("Commandes liées aux utilisateurs.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("profil")
            .setDescription("Affiche le profil d'un utilisateur.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("Utilisateur à afficher")
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("avatar")
            .setDescription("Affiche l'avatar d'un utilisateur.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("Utilisateur dont afficher l'avatar")
                .setRequired(false)
            )
        )
    )
    
    // Groupe de sous-commandes : moderation
    .addSubcommandGroup((group) =>
      group
        .setName("moderation")
        .setDescription("Commandes de modération.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("warn")
            .setDescription("Avertit un utilisateur.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("Utilisateur à avertir")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("raison")
                .setDescription("Raison de l'avertissement")
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("kick")
            .setDescription("Expulse un utilisateur.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("Utilisateur à expulser")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("raison")
                .setDescription("Raison de l'expulsion")
                .setRequired(false)
            )
        )
    ),

  async execute(interaction) {
    // On récupère le groupe de sous-commande s'il existe
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    try {
      let subcommandFile;

      // Si on est dans un groupe, on charge depuis le dossier correspondant
      if (subcommandGroup) {
        subcommandFile = require(
          path.join(__dirname, "exemple1", subcommandGroup, `${subcommand}.js`)
        );
      } else {
        subcommandFile = require(
          path.join(__dirname, "exemple1", `${subcommand}.js`)
        );
      }
      
      await subcommandFile.execute(interaction);
    } catch (error) {
      console.error(
        `⚠️ Erreur lors de l'exécution de la commande ${subcommand}${
          subcommandGroup ? ` du groupe ${subcommandGroup}` : ""
        }:`,
        error
      );
      
      await interaction.reply({
        content: `Une erreur est survenue lors de l'exécution de la commande.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
