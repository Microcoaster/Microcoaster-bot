const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const WarrantyDAO = require("../dao/warrantyDAO");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("activate-warranty")
    .setDescription("🛡️ [ADMIN] Activate warranty for a specific code")
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("The premium/warranty code to activate")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "User to assign the code to (required if code is not linked)",
        )
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      // Vérifier si l'interaction est encore valide avant de la différer
      if (!interaction.isRepliable()) {
        console.error(`[activate-warranty] Interaction is no longer repliable for ${interaction.user.tag}`);
        return;
      }

      // Déferer immédiatement pour éviter l'expiration
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        console.log(`[activate-warranty] Successfully deferred reply for ${interaction.user.tag}`);
      } catch (deferError) {
        console.error(`[activate-warranty] Failed to defer reply:`, deferError);
        // Si on ne peut pas différer, essayer de répondre directement
        if (!interaction.replied) {
          try {
            await interaction.reply({
              content: "❌ An error occurred while processing your request. Please try again.",
              flags: MessageFlags.Ephemeral,
            });
          } catch (replyError) {
            console.error(`[activate-warranty] Failed to reply directly:`, replyError);
          }
        }
        return;
      }

      console.log(`[activate-warranty] Command started by ${interaction.user.tag} (${interaction.user.id})`);

      // Vérification des permissions admin
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        console.log(`[activate-warranty] Permission denied for ${interaction.user.tag}`);
        return await interaction.editReply({
          content: "❌ You need Administrator permissions to use this command.",
        });
      }

      const code = interaction.options.getString("code");
      const targetUser = interaction.options.getUser("user");
      const adminId = interaction.user.id;

      console.log(`[activate-warranty] Processing code: ${code}, targetUser: ${targetUser?.tag || 'None'}`);

      const warrantyDAO = new WarrantyDAO();

      try {
        // Activer la garantie
        console.log(`[activate-warranty] Calling activateWarranty...`);
        const result = await warrantyDAO.activateWarranty(
          code,
          adminId,
          targetUser ? targetUser.id : null,
        );
        console.log(`[activate-warranty] ActivateWarranty completed successfully`);

        // Si le code a été activé sans utilisateur
        if (result.codeActivatedWithoutUser) {
          console.log(`[activate-warranty] Code activated without user assignment`);
          const noUserEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("✅ Code Activated Without User Assignment")
            .setDescription(
              `Code \`${code}\` has been successfully activated with warranty period, but is not yet assigned to any user.`,
            )
            .addFields(
              {
                name: "📅 Activation Date",
                value: new Date().toLocaleDateString(),
                inline: true,
              },
              {
                name: "⏰ Expires On",
                value: result.expirationDate.toLocaleDateString(),
                inline: true,
              },
              { name: "👨‍💼 Activated By", value: `<@${adminId}>`, inline: true },
              {
                name: "📝 Status",
                value: "Ready to be linked to a user",
                inline: false,
              },
              {
                name: "💡 Next Steps",
                value:
                  "When a user claims this code, they will automatically receive the full warranty period.",
                inline: false,
              },
            )
            .setFooter({ text: "MicroCoaster™ Warranty System" })
            .setTimestamp();

          return await interaction.editReply({ embeds: [noUserEmbed] });
        }

        // Récupérer l'utilisateur Discord si un utilisateur est assigné
        const user = result.userId
          ? await interaction.guild.members.fetch(result.userId)
          : null;

        if (user) {
          // Récupérer la configuration des rôles
          const config = require("../config/config.json");
          const warrantyRoleId = config.roles.warranty_role_id;
          const premiumRoleId = config.roles.premium_role_id;

          // Donner le rôle Garantie Active
          const rolesAssigned = [];
          if (warrantyRoleId) {
            const warrantyRole =
              interaction.guild.roles.cache.get(warrantyRoleId);
            if (warrantyRole) {
              await user.roles.add(warrantyRole);
              rolesAssigned.push("🛡️ Warranty");
              console.log(`✅ Rôle de garantie attribué à ${user.user.tag}`);
            } else {
              console.log(`❌ Rôle de garantie introuvable: ${warrantyRoleId}`);
            }
          }

          // Donner aussi le rôle Premium si pas déjà présent
          if (premiumRoleId) {
            const premiumRole =
              interaction.guild.roles.cache.get(premiumRoleId);
            if (premiumRole && !user.roles.cache.has(premiumRoleId)) {
              await user.roles.add(premiumRole);
              rolesAssigned.push("🎖️ Premium");
              console.log(`✅ Rôle premium attribué à ${user.user.tag}`);
            }
          }

          // Logger dans le canal de logs de rôles
          const roleLogsChannelId = config.channels.role_logs_channel_id;
          if (roleLogsChannelId && rolesAssigned.length > 0) {
            const logChannel = interaction.guild.channels.cache.get(roleLogsChannelId);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setColor("#00ff00")
                .setTitle("🛡️ Warranty Activation - Roles Assigned")
                .setDescription(`Roles assigned during admin warranty activation`)
                .addFields(
                  {
                    name: "👤 User",
                    value: `${user.user.tag} (<@${result.userId}>)`,
                    inline: true,
                  },
                  {
                    name: "🎫 Code",
                    value: `\`${code}\``,
                    inline: true,
                  },
                  {
                    name: "🎭 Roles Assigned",
                    value: rolesAssigned.join(", "),
                    inline: true,
                  },
                  {
                    name: "👨‍💼 Activated By",
                    value: `<@${adminId}>`,
                    inline: true,
                  },
                  {
                    name: "⚡ Trigger",
                    value: "Admin warranty activation",
                    inline: false,
                  }
                )
                .setTimestamp();

              try {
                await logChannel.send({ embeds: [logEmbed] });
              } catch (logError) {
                console.error(`Error sending role log for warranty activation:`, logError);
              }
            }
          }

          // Créer l'embed de confirmation pour l'admin
          const adminEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("✅ Warranty Activated Successfully")
            .setDescription(`Warranty has been activated for code: \`${code}\``)
            .addFields(
              {
                name: "👤 User",
                value: `${user.user.tag} (<@${result.userId}>)`,
                inline: true,
              },
              {
                name: "📅 Activation Date",
                value: new Date().toLocaleDateString(),
                inline: true,
              },
              {
                name: "⏰ Expires On",
                value: result.expirationDate.toLocaleDateString(),
                inline: true,
              },
              { name: "👨‍💼 Activated By", value: `<@${adminId}>`, inline: true },
            )
            .setFooter({ text: "MicroCoaster™ Warranty System" })
            .setTimestamp();

          await interaction.editReply({ embeds: [adminEmbed] });

          // Envoyer un message privé à l'utilisateur
          try {
            const userEmbed = new EmbedBuilder()
              .setColor("#00ff00")
              .setTitle("🛡️ Warranty Activated!")
              .setDescription(
                `Great news! Your **MicroCoaster™** warranty has been activated by our team.`,
              )
              .addFields(
                {
                  name: "📅 Activation Date",
                  value: new Date().toLocaleDateString(),
                  inline: true,
                },
                {
                  name: "⏰ Valid Until",
                  value: result.expirationDate.toLocaleDateString(),
                  inline: true,
                },
                {
                  name: "🎯 Coverage",
                  value:
                    "1 year full warranty on your 3D printed microcoasters",
                  inline: false,
                },
                {
                  name: "📞 Support",
                  value:
                    "Use our support system in the Discord server if you need assistance",
                  inline: false,
                },
              )
              .setFooter({
                text: "MicroCoaster™ • Thank you for your purchase!",
              })
              .setTimestamp();

            await user.send({ embeds: [userEmbed] });
          } catch (dmError) {
            console.log(
              `Could not send DM to user ${result.userId}:`,
              dmError.message,
            );
          }
        } else {
          // L'utilisateur n'est plus sur le serveur
          const warningEmbed = new EmbedBuilder()
            .setColor("#ff9900")
            .setTitle("⚠️ Warranty Activated with Warning")
            .setDescription(
              `Warranty has been activated for code: \`${code}\`\n\n**Warning:** The user is no longer in this server. The warranty will be activated when they rejoin.`,
            )
            .addFields(
              { name: "👤 User ID", value: result.userId, inline: true },
              {
                name: "📅 Activation Date",
                value: new Date().toLocaleDateString(),
                inline: true,
              },
              {
                name: "⏰ Expires On",
                value: result.expirationDate.toLocaleDateString(),
                inline: true,
              },
            )
            .setFooter({ text: "MicroCoaster™ Warranty System" })
            .setTimestamp();

          await interaction.editReply({ embeds: [warningEmbed] });
        }
      } catch (warrantyError) {
        console.error("Warranty activation error:", warrantyError);

        let errorMessage = "An unknown error occurred.";
        let suggestion = "Please try again or contact support.";

        if (warrantyError.message.includes("Code not found")) {
          errorMessage = "The specified code does not exist in the database.";
          suggestion =
            "Verify the code is correct and has been added to the system.";
        } else if (warrantyError.message.includes("already activated")) {
          errorMessage = "The warranty for this code is already activated.";
          suggestion =
            "Check the warranty status with `/warranty-check` command.";
        }

        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Warranty Activation Failed")
          .setDescription(errorMessage)
          .addFields(
            { name: "🔍 Code Checked", value: `\`${code}\``, inline: true },
            { name: "💡 Suggestion", value: suggestion, inline: false },
          )
          .setFooter({ text: "MicroCoaster™ Warranty System" })
          .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
      }
    } catch (error) {
      console.error("Error in activate-warranty command:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ System Error")
        .setDescription(
          "A system error occurred while processing the warranty activation.",
        )
        .setFooter({ text: "Please contact the developer if this persists." })
        .setTimestamp();

      try {
        // Vérifier l'état de l'interaction avant d'essayer de répondre
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            embeds: [errorEmbed],
            flags: MessageFlags.Ephemeral,
          });
        } else {
          console.log(`[activate-warranty] Interaction already handled, cannot send error message`);
        }
      } catch (replyError) {
        console.error("Could not send error message to user:", replyError);
      }
    }
  },
};
