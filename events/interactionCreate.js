/**
 * Gestionnaire de l'événement "interactionCreate".
 *
 * Ce module gère les interactions reçues par le bot, que ce soit des commandes, des soumissions de modal ou des clics de bouton.
 *
 * Pour chaque type d'interaction, il recherche dynamiquement le gestionnaire approprié et exécute la logique correspondante.
 */

const { MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "interactionCreate",
  /**
   * Exécute le gestionnaire d'interaction.
   *
   * @param {Interaction} interaction - L'interaction reçue.
   * @param {Client} client - Le client Discord.
   */
  execute: async (interaction, client) => {
    const user = interaction.guild
      ? interaction.guild.members.cache.get(interaction.user.id)?.displayName ||
        interaction.user.username
      : interaction.user.username; // Gestion des commandes slash
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(
          `⚠️\x1b[38;5;1m  Commande ${interaction.commandName} non trouvée.`,
        );
        return;
      }

      try {
        console.log(
          `\x1b[38;5;4mCommande exécutée par ${user}: ${interaction.commandName}\x1b[0m`,
        );

        await command.execute(interaction);

        // Logger la commande dans les statistiques après l'exécution (non-bloquant)
        if (interaction.client.statsLogger) {
          setImmediate(async () => {
            try {
              await interaction.client.statsLogger.logCommand(
                interaction.commandName,
                interaction.user,
                interaction.guild,
              );
            } catch (statsError) {
              console.log(
                "Stats logging failed (non-critical):",
                statsError.message,
              );
            }
          });
        }
      } catch (error) {
        console.error(
          `⚠️\x1b[38;5;1m  Erreur lors de l'exécution de la commande ${interaction.commandName} par ${user}:`,
          error,
        );

        try {
          // Check if the interaction has been deferred or replied to
          if (interaction.deferred) {
            await interaction.editReply({
              content:
                "Une erreur s'est produite lors de l'exécution de cette commande.",
            });
          } else if (!interaction.replied) {
            await interaction.reply({
              content:
                "Une erreur s'est produite lors de l'exécution de cette commande.",
              flags: MessageFlags.Ephemeral,
            });
          }
        } catch (replyError) {
          console.error(
            `⚠️\x1b[38;5;1m  Could not send error message to user:`,
            replyError,
          );
        }
      }
    }

    // Gestion des soumissions de modal (formulaire)
    if (interaction.isModalSubmit()) {
      // Gérer les modals de configuration spécialement
      if (interaction.customId.startsWith("config_modal_")) {
        const configModalHandler = require("../modals/configModal");
        try {
          console.log(
            `\x1b[38;5;2mModal de configuration soumis par ${user}: ${interaction.customId}\x1b[0m`,
          );
          await configModalHandler.execute(interaction);
        } catch (error) {
          console.error(
            `⚠️\x1b[38;5;1m  Erreur lors du traitement du modal de configuration ${interaction.customId} par ${user}:`,
            error,
          );
        }
        return;
      }

      // Construit le chemin vers le gestionnaire de modal en se basant sur l'ID personnalisé
      const modalHandlerPath = path.join(
        __dirname,
        "../modals",
        `${interaction.customId}.js`,
      );
      if (fs.existsSync(modalHandlerPath)) {
        const modalHandler = require(modalHandlerPath);
        try {
          console.log(
            `\x1b[38;5;2mModal soumis par ${user}: ${interaction.customId}\x1b[0m`,
          );
          await modalHandler.execute(interaction);
        } catch (error) {
          console.error(
            `⚠️\x1b[38;5;1m  Erreur lors du traitement du modal ${interaction.customId} par ${user}:`,
            error,
          );

          // Only try to respond if the interaction hasn't been handled yet
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content:
                  "Une erreur s'est produite lors du traitement de ce formulaire.",
                flags: MessageFlags.Ephemeral,
              });
            }
          } catch (replyError) {
            console.error(
              `⚠️\x1b[38;5;1m  Could not send error message for modal interaction:`,
              replyError,
            );
          }
        }
      } else {
        console.error(
          `⚠️\x1b[38;5;1m  Handler de modal ${interaction.customId} non trouvé.`,
        );
      }
    }

    // Gestion des clics sur les boutons
    if (interaction.isButton()) {
      // On divise le customId pour extraire le nom et les paramètres éventuels
      const [buttonName, ...params] = interaction.customId.split(":");

      // Mapping pour les boutons de ticket - tous utilisent le handler unifié
      const ticketTypes = [
        "ticket_technical",
        "ticket_product",
        "ticket_business",
        "ticket_recruitment",
      ];

      let buttonHandlerPath;
      let handlerName = buttonName;

      if (ticketTypes.includes(buttonName)) {
        // Tous les types de tickets utilisent le handler unifié
        buttonHandlerPath = path.join(
          __dirname,
          "../buttons",
          "ticketHandler.js",
        );
        handlerName = "ticketHandler";
      } else {
        // Autres boutons utilisent leur propre handler
        buttonHandlerPath = path.join(
          __dirname,
          "../buttons",
          `${buttonName}.js`,
        );
      }
      if (fs.existsSync(buttonHandlerPath)) {
        const buttonHandler = require(buttonHandlerPath);
        try {
          console.log(
            `\x1b[38;5;6mBouton cliqué par ${user}: ${buttonName} (handler: ${handlerName})\x1b[0m`,
          );
          await buttonHandler.execute(interaction, params);
        } catch (error) {
          console.error(
            `⚠️\x1b[38;5;1m  Erreur lors du traitement du bouton ${interaction.customId} par ${user}:`,
            error,
          );

          // Only try to respond if the interaction hasn't been handled yet
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content:
                  "Une erreur s'est produite lors du traitement de cette action.",
                flags: MessageFlags.Ephemeral,
              });
            }
          } catch (replyError) {
            console.error(
              `⚠️\x1b[38;5;1m  Could not send error message for button interaction:`,
              replyError,
            );
          }
        }
      } else {
        console.error(
          `⚠️\x1b[38;5;1m  Handler de bouton ${handlerName} non trouvé.`,
        );
      }
    }

    // Gestion des menus déroulants (StringSelectMenu)
    if (interaction.isStringSelectMenu()) {
      // On divise le customId pour extraire le nom et les paramètres éventuels
      const [menuName, ...params] = interaction.customId.split(":");

      // Gérer les menus de configuration spécialement
      if (interaction.customId.startsWith("config_")) {
        const configHandler = require("../buttons/configHandler");
        try {
          console.log(
            `\x1b[38;5;5mMenu de configuration utilisé par ${user}: ${interaction.customId}\x1b[0m`,
          );
          await configHandler.execute(interaction, interaction.client);
        } catch (error) {
          console.error(
            `⚠️\x1b[38;5;1m  Erreur lors du traitement du menu de configuration ${interaction.customId} par ${user}:`,
            error,
          );
        }
        return;
      }

      // Gérer les autres menus (tickets, etc.)
      const menuHandlerPath = path.join(
        __dirname,
        "../buttons",
        `${menuName}.js`,
      );

      if (fs.existsSync(menuHandlerPath)) {
        const menuHandler = require(menuHandlerPath);
        try {
          console.log(
            `\x1b[38;5;5mMenu utilisé par ${user}: ${menuName}\x1b[0m`,
          );
          await menuHandler.execute(interaction, params);
        } catch (error) {
          console.error(
            `⚠️\x1b[38;5;1m  Erreur lors du traitement du menu ${interaction.customId} par ${user}:`,
            error,
          );
        }
      } else {
        console.error(
          `⚠️\x1b[38;5;1m  Handler de menu ${menuName} non trouvé.`,
        );
      }
    }
  },
};
