const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const WarrantyDAO = require("../dao/warrantyDAO");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warranty-extend")
    .setDescription("Extend a warranty period by code")
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("The warranty code to extend")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("months")
        .setDescription("Number of months to extend the warranty")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(24),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for extending the warranty")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    try {
      const code = interaction.options.getString("code");
      const months = interaction.options.getInteger("months");
      const reason =
        interaction.options.getString("reason") || "Extended by staff";
      const warrantyDAO = new WarrantyDAO();

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Vérifier si le code existe et est activé
      const codeData = await warrantyDAO.getCodeByValue(code);

      if (!codeData) {
        const embed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Code Not Found")
          .setDescription(`Warranty code \`${code}\` was not found in the database.`)
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      if (!codeData.warranty_activated) {
        const embed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Warranty Not Activated")
          .setDescription(`Warranty code \`${code}\` is not yet activated.`)
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Convertir les mois en jours (approximation: 1 mois = 30 jours)
      const daysToAdd = months * 30;

      // Étendre la garantie (même si pas lié à un utilisateur)
      const newExpiration = await warrantyDAO.extendWarrantyByCode(
        code, 
        daysToAdd, 
        interaction.user.id
      );

      // Récupérer les informations de l'utilisateur pour l'affichage (si lié)
      const targetUser = codeData.user_id ? await interaction.client.users.fetch(codeData.user_id).catch(() => null) : null;
      const userDisplay = codeData.user_id 
        ? (targetUser ? `${targetUser.tag} (<@${codeData.user_id}>)` : `User ID: ${codeData.user_id}`)
        : "Not linked to any user";

      // Créer l'embed de confirmation
      const successEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("✅ Warranty Extended Successfully")
        .addFields(
          {
            name: "Code",
            value: `\`${code}\``,
            inline: true,
          },
          {
            name: "User",
            value: userDisplay,
            inline: true,
          },
          { name: "Extension", value: `${months} months`, inline: true },
          {
            name: "Previous Expiration",
            value: `<t:${Math.floor(new Date(codeData.warranty_expires_at).getTime() / 1000)}:F>`,
            inline: false,
          },
          {
            name: "New Expiration",
            value: `<t:${Math.floor(newExpiration.getTime() / 1000)}:F>`,
            inline: false,
          },
          { name: "Reason", value: reason, inline: false },
          {
            name: "Extended by",
            value: `${interaction.user.tag}`,
            inline: true,
          },
        );

      // Ajouter une note si le code n'est pas lié
      if (!codeData.user_id) {
        successEmbed.addFields({
          name: "📝 Note",
          value: "This code is not linked to any user. The extended warranty will be applied when the code is claimed.",
          inline: false,
        });
      }

      successEmbed.setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      // Envoyer un DM à l'utilisateur si possible et si lié
      if (codeData.user_id && targetUser) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("🎉 Warranty Extended")
            .setDescription(
              "Great news! Your MicroCoaster™ warranty has been extended.",
            )
            .addFields(
              {
                name: "Warranty Code",
                value: `\`${code}\``,
                inline: true,
              },
              {
                name: "Extension",
                value: `${months} additional months`,
                inline: true,
              },
              {
                name: "New Expiration Date",
                value: `<t:${Math.floor(newExpiration.getTime() / 1000)}:F>`,
                inline: false,
              },
              { name: "Reason", value: reason, inline: false },
            )
            .setFooter({ text: "Thank you for choosing MicroCoaster™!" })
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(
            `Impossible d'envoyer un DM à l'utilisateur ${codeData.user_id}: ${dmError.message}`,
          );
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'extension de garantie:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Error")
        .setDescription(
          "An error occurred while extending the warranty. Please try again.",
        )
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  },
};
