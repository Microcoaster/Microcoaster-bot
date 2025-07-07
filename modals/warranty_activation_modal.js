const { EmbedBuilder, MessageFlags } = require("discord.js");
const WarrantyDAO = require("../dao/warrantyDAO");
const warrantyDAO = new WarrantyDAO();

module.exports = {
  execute: async (interaction) => {
    try {
      // Vérifier si l'interaction est toujours valide
      if (!interaction.isModalSubmit()) {
        console.error("❌ Interaction invalide reçue");
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const warrantyCode = interaction.fields
        .getTextInputValue("warranty_code")
        .trim()
        .toUpperCase();
      const user = interaction.user;
      const guild = interaction.guild;

      // Vérifier si le code existe et est valide
      const codeData = await warrantyDAO.getCodeByValue(warrantyCode);

      if (!codeData) {
        const embed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Invalid Code")
          .setDescription(
            "The code you entered is not valid or does not exist.",
          )
          .addFields(
            {
              name: "Code Entered",
              value: `\`${warrantyCode}\``,
              inline: true,
            },
            {
              name: "Need Help?",
              value:
                "Please check your code and try again, or contact support if you believe this is an error.",
              inline: false,
            },
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Vérifier si le code n'est pas déjà utilisé
      if (codeData.is_used || codeData.user_id) {
        const embed = new EmbedBuilder()
          .setColor("#ff9900")
          .setTitle("⚠️ Code Already Used")
          .setDescription(
            "This code has already been activated by another user.",
          )
          .addFields(
            { name: "Code", value: `\`${warrantyCode}\``, inline: true },
            { name: "Status", value: "Already activated", inline: true },
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Vérifier si le code n'a pas expiré
      const now = new Date();
      const expirationDate = new Date(codeData.expiration_date);

      if (expirationDate <= now) {
        const embed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Code Expired")
          .setDescription(
            "This code has expired and can no longer be activated.",
          )
          .addFields(
            { name: "Code", value: `\`${warrantyCode}\``, inline: true },
            {
              name: "Expired On",
              value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`,
              inline: true,
            },
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      } // Activer le code (lier à l'utilisateur)
      const linkResult = await warrantyDAO.linkCodeToUser(
        warrantyCode,
        user.id,
        guild.id,
      );

      // Récupérer la configuration des rôles
      const config = require("../config/config.json");
      const premiumRoleId = config.roles.premium_role_id;
      const warrantyRoleId = config.roles.warranty_role_id;

      // Attribuer le rôle Premium
      let premiumRoleAdded = false;
      if (premiumRoleId) {
        const premiumRole = guild.roles.cache.get(premiumRoleId);
        if (premiumRole) {
          const member = await guild.members.fetch(user.id);
          if (!member.roles.cache.has(premiumRoleId)) {
            await member.roles.add(premiumRole);
            premiumRoleAdded = true;
          }
        }
      }

      // Vérifier si la garantie est déjà activée pour ce code
      let warrantyActive = false;
      let warrantyRoleAdded = false;

      // Utiliser les données du résultat de liaison pour déterminer le statut de garantie
      if (linkResult.warrantyActivated) {
        warrantyActive = true;

        // Attribuer aussi le rôle de garantie active
        if (warrantyRoleId) {
          const warrantyRole = guild.roles.cache.get(warrantyRoleId);
          if (warrantyRole) {
            const member = await guild.members.fetch(user.id);
            if (!member.roles.cache.has(warrantyRoleId)) {
              await member.roles.add(warrantyRole);
              warrantyRoleAdded = true;
            }
          }
        }
      }      // Mettre à jour le statut des rôles dans la base de données
      await warrantyDAO.updateUserRoleStatus({
        user_id: user.id,
        has_premium: true,
        has_warranty: warrantyActive,
        code_linked: true,
        warranty_expires_at: warrantyActive ? linkResult.warrantyExpires : null,
      });

      // Logger dans le canal de logs de rôles
      const roleLogsChannelId = config.channels.role_logs_channel_id;
      if (roleLogsChannelId) {
        const logChannel = guild.channels.cache.get(roleLogsChannelId);
        if (logChannel) {
          const rolesAssigned = [];
          if (premiumRoleAdded) rolesAssigned.push("🎖️ Premium");
          if (warrantyRoleAdded) rolesAssigned.push("🛡️ Warranty");

          if (rolesAssigned.length > 0) {
            const logEmbed = new EmbedBuilder()
              .setColor("#00ff00")
              .setTitle("🎫 Code Activation - Roles Assigned")
              .setDescription(`Roles automatically assigned during code activation`)
              .addFields(
                {
                  name: "👤 User",
                  value: `${user.tag} (<@${user.id}>)`,
                  inline: true,
                },
                {
                  name: "🎫 Code",
                  value: `\`${warrantyCode}\``,
                  inline: true,
                },
                {
                  name: "🎭 Roles Assigned",
                  value: rolesAssigned.join(", "),
                  inline: true,
                },
                {
                  name: "⚡ Trigger",
                  value: "User code activation",
                  inline: false,
                }
              )
              .setTimestamp();

            try {
              await logChannel.send({ embeds: [logEmbed] });
            } catch (logError) {
              console.error(`Error sending role log for ${user.tag}:`, logError);
            }
          }
        }
      }

      // Logger l'activation
      await warrantyDAO.logWarrantyAction({
        warranty_id: linkResult.codeData.id,
        user_id: user.id,
        action_type: "CODE_LINKED",
        action_details: `Code ${warrantyCode} successfully linked to user`,
        performed_by: user.id,
      });

      // Créer l'embed de succès
      const successEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("✅ Code Activated Successfully!")
        .setDescription(`Your premium code has been successfully activated!`)
        .addFields(
          { name: "Code", value: `\`${warrantyCode}\``, inline: true },
          {
            name: "Product",
            value: codeData.product_type || "MicroCoaster™",
            inline: true,
          },
          {
            name: "Premium Access",
            value: premiumRoleAdded ? "✅ Granted" : "✅ Already active",
            inline: true,
          },
        ); // Ajouter les informations de garantie si active
      if (warrantyActive) {
        const warrantyExpiration = new Date(linkResult.warrantyExpires);
        successEmbed.addFields(
          {
            name: "Warranty Status",
            value: warrantyRoleAdded ? "✅ Activated" : "✅ Already active",
            inline: true,
          },
          {
            name: "Warranty Valid Until",
            value: `<t:${Math.floor(warrantyExpiration.getTime() / 1000)}:F>`,
            inline: false,
          },
        );
      } else {
        successEmbed.addFields(
          {
            name: "Warranty Status",
            value: "⏳ Pending activation by staff",
            inline: false,
          },
          {
            name: "Next Steps",
            value:
              "An administrator will activate your warranty shortly. You will be notified when this happens.",
            inline: false,
          },
        );
      }

      successEmbed.setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      // Envoyer un DM à l'utilisateur avec les détails
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("🎉 Welcome to MicroCoaster™ Premium!")
          .setDescription("Your premium code has been successfully activated!")
          .addFields(
            {
              name: "Code Activated",
              value: `\`${warrantyCode}\``,
              inline: true,
            },
            {
              name: "Product",
              value: codeData.product_type || "MicroCoaster™",
              inline: true,
            },
            {
              name: "Premium Benefits",
              value:
                "• Access to premium channels\n• Priority support\n• Exclusive content and updates",
              inline: false,
            },
          );

        if (warrantyActive) {
          dmEmbed.addFields({
            name: "Warranty Coverage",
            value: `Your warranty is active until <t:${Math.floor(new Date(codeData.warranty_expires_at).getTime() / 1000)}:F>`,
            inline: false,
          });
        } else {
          dmEmbed.addFields({
            name: "Warranty Activation",
            value:
              "Your warranty will be activated by our staff shortly. You will receive another notification when this happens.",
            inline: false,
          });
        }

        dmEmbed
          .setFooter({ text: "Thank you for choosing MicroCoaster™!" })
          .setTimestamp();

        await user.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.log(
          `Impossible d'envoyer un DM à ${user.tag}: ${dmError.message}`,
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'activation du code de garantie:", error);

      let errorTitle = "❌ Error";
      let errorDescription =
        "An error occurred while activating your code. Please try again later or contact support.";

      // Handle specific errors
      if (error.message.includes("Column count doesn't match")) {
        errorTitle = "❌ Database Error";
        errorDescription =
          "A database error occurred. The administrators have been notified. Please try again later.";
      } else if (error.message.includes("already linked to another user")) {
        errorTitle = "❌ Code Already Used";
        errorDescription =
          "This code has already been linked to another user and cannot be used again.";
      } else if (error.message.includes("Code not found")) {
        errorTitle = "❌ Invalid Code";
        errorDescription = "The code you entered does not exist or is invalid.";
      }

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle(errorTitle)
        .setDescription(errorDescription)
        .setTimestamp();

      try {
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            embeds: [errorEmbed],
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (replyError) {
        console.error("Could not send error message to user:", replyError);
      }
    }
  },
};
