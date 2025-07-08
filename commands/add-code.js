const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const WarrantyDAO = require("../dao/warrantyDAO");
const ConfigManager = require("../utils/configManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add-code")
    .setDescription("🔧 [ADMIN] Add a new warranty/premium code to the system")
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("The warranty/premium code to add")
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(50),
    )
    .addStringOption((option) =>
      option
        .setName("product_info")
        .setDescription("Product information (optional)")
        .setRequired(false)
        .setMaxLength(255),
    )
    .addUserOption((option) =>
      option
        .setName("assign_to")
        .setDescription("Directly assign this code to a user (optional)")
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("activate_warranty")
        .setDescription(
          "Activate warranty immediately if assigned to user (default: false)",
        )
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      // Vérification des permissions admin
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return await interaction.reply({
          content: "❌ You need Administrator permissions to use this command.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const code = interaction.options.getString("code").trim().toUpperCase();
      const productInfo = interaction.options.getString("product_info") || null;
      const assignToUser = interaction.options.getUser("assign_to");
      const activateWarranty =
        interaction.options.getBoolean("activate_warranty") || false;
      const adminId = interaction.user.id;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const warrantyDAO = new WarrantyDAO();

      try {
        // Vérifier si le code existe déjà
        const existingCode = await warrantyDAO.getCodeByValue(code);
        if (existingCode) {
          const errorEmbed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("❌ Code Already Exists")
            .setDescription(
              `The code \`${code}\` already exists in the database.`,
            )
            .addFields(
              {
                name: "Existing Code Status",
                value: existingCode.is_used ? "Used" : "Available",
                inline: true,
              },
              {
                name: "Linked To",
                value: existingCode.user_id
                  ? `<@${existingCode.user_id}>`
                  : "Nobody",
                inline: true,
              },
            )
            .setTimestamp();

          return await interaction.editReply({ embeds: [errorEmbed] });
        }

        // Créer le code
        const codeId = await warrantyDAO.createCode(code, productInfo);

        let warrantyActivated = false;
        let statusMessages = [];

        // Si assigné à un utilisateur
        if (assignToUser) {
          try {
            await warrantyDAO.linkCodeToUser(
              code,
              assignToUser.id,
              interaction.guild.id,
            );
            statusMessages.push(`✅ Code assigned to ${assignToUser.tag}`);

            // Donner le rôle Premium
            const configManager = ConfigManager.getInstance();
            const config = configManager.getConfig();
            const premiumRoleId = config.roles.premium_role_id;
            const rolesAssigned = [];

            if (premiumRoleId) {
              const premiumRole =
                interaction.guild.roles.cache.get(premiumRoleId);
              if (premiumRole) {
                const member = await interaction.guild.members.fetch(
                  assignToUser.id,
                );
                if (!member.roles.cache.has(premiumRoleId)) {
                  await member.roles.add(premiumRole);
                  rolesAssigned.push("🎖️ Premium");
                  statusMessages.push(`✅ Premium role assigned`);
                }
              }
            }

            // Activer la garantie si demandé
            if (activateWarranty) {
              try {
                const result = await warrantyDAO.activateWarranty(
                  code,
                  adminId,
                  interaction.guild.id,
                );
                warrantyActivated = true;
                statusMessages.push(
                  `✅ Warranty activated until ${result.expirationDate.toLocaleDateString()}`,
                );

                // Donner le rôle de garantie
                const warrantyRoleId = config.roles.warranty_role_id;
                if (warrantyRoleId) {
                  const warrantyRole =
                    interaction.guild.roles.cache.get(warrantyRoleId);
                  if (warrantyRole) {
                    const member = await interaction.guild.members.fetch(
                      assignToUser.id,
                    );
                    if (!member.roles.cache.has(warrantyRoleId)) {
                      await member.roles.add(warrantyRole);
                      rolesAssigned.push("🛡️ Warranty");
                      statusMessages.push(`✅ Warranty role assigned`);
                    }
                  }
                }

                // Logger dans le canal de logs de rôles
                const roleLogsChannelId = config.channels.role_logs_channel_id;
                if (roleLogsChannelId && rolesAssigned.length > 0) {
                  const logChannel =
                    interaction.guild.channels.cache.get(roleLogsChannelId);
                  if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                      .setColor("#00ff00")
                      .setTitle("🔧 Code Creation - Roles Assigned")
                      .setDescription(
                        `Roles assigned during code creation and assignment`,
                      )
                      .addFields(
                        {
                          name: "👤 User",
                          value: `${assignToUser.tag} (<@${assignToUser.id}>)`,
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
                          name: "👨‍💼 Created By",
                          value: `<@${adminId}>`,
                          inline: true,
                        },
                        {
                          name: "⚡ Trigger",
                          value: "Admin code creation",
                          inline: false,
                        },
                      )
                      .setTimestamp();

                    try {
                      await logChannel.send({ embeds: [logEmbed] });
                    } catch (logError) {
                      console.error(
                        `Error sending role log for code creation:`,
                        logError,
                      );
                    }
                  }
                }

                // Envoyer un DM à l'utilisateur
                try {
                  const userEmbed = new EmbedBuilder()
                    .setColor("#00ff00")
                    .setTitle("🎉 Your MicroCoaster™ Code Has Been Activated!")
                    .setDescription(
                      `Great news! Your premium code has been activated with full warranty coverage.`,
                    )
                    .addFields(
                      { name: "🎫 Code", value: `\`${code}\``, inline: true },
                      {
                        name: "📅 Activated",
                        value: new Date().toLocaleDateString(),
                        inline: true,
                      },
                      {
                        name: "⏰ Warranty Until",
                        value: result.expirationDate.toLocaleDateString(),
                        inline: true,
                      },
                      {
                        name: "🎯 Coverage",
                        value:
                          "1 year full warranty on your 3D printed microcoasters",
                        inline: false,
                      },
                    )
                    .setFooter({
                      text: "MicroCoaster™ • Thank you for your purchase!",
                    })
                    .setTimestamp();

                  await assignToUser.send({ embeds: [userEmbed] });
                  statusMessages.push(`✅ Notification sent to user`);
                } catch {
                  statusMessages.push(`⚠️ Could not send DM to user`);
                }
              } catch (warrantyError) {
                statusMessages.push(
                  `❌ Warranty activation failed: ${warrantyError.message}`,
                );
              }
            }
          } catch (assignError) {
            statusMessages.push(`❌ Assignment failed: ${assignError.message}`);
          }
        }

        // Créer l'embed de confirmation
        const successEmbed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("✅ Code Added Successfully")
          .setDescription(`New warranty code has been created in the system.`)
          .addFields(
            { name: "🎫 Code", value: `\`${code}\``, inline: true },
            {
              name: "📦 Product Info",
              value: productInfo || "None specified",
              inline: true,
            },
            { name: "🆔 Code ID", value: `${codeId}`, inline: true },
          );

        if (assignToUser) {
          successEmbed.addFields(
            {
              name: "👤 Assigned To",
              value: `${assignToUser.tag} (<@${assignToUser.id}>)`,
              inline: true,
            },
            {
              name: "🛡️ Warranty Status",
              value: warrantyActivated
                ? "✅ Activated"
                : "⏳ Pending Admin Activation",
              inline: true,
            },
          );
        } else {
          successEmbed.addFields({
            name: "📋 Status",
            value: "Available for user activation",
            inline: false,
          });
        }

        if (statusMessages.length > 0) {
          successEmbed.addFields({
            name: "📊 Actions Performed",
            value: statusMessages.join("\n"),
            inline: false,
          });
        }

        successEmbed
          .addFields({
            name: "👨‍💼 Created By",
            value: `<@${adminId}>`,
            inline: true,
          })
          .setFooter({ text: "MicroCoaster™ Code Management System" })
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });
      } catch (dbError) {
        console.error("Database error in add-code command:", dbError);

        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Database Error")
          .setDescription(
            "An error occurred while adding the code to the database.",
          )
          .addFields(
            { name: "🔍 Code Attempted", value: `\`${code}\``, inline: true },
            {
              name: "💡 Suggestion",
              value: "Please try again or contact the developer.",
              inline: false,
            },
          )
          .setFooter({ text: "MicroCoaster™ Code Management System" })
          .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
      }
    } catch (error) {
      console.error("Error in add-code command:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ System Error")
        .setDescription("A system error occurred while processing the command.")
        .setFooter({ text: "Please contact the developer if this persists." })
        .setTimestamp();
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({
          embeds: [errorEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
