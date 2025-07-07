const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const WarrantyDAO = require("../dao/warrantyDAO");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-pending-warranties")
    .setDescription("List all pending warranty activations")
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Show codes created in the last X days (default: 30)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(365),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    try {
      const days = interaction.options.getInteger("days") || 30;
      const warrantyDAO = new WarrantyDAO();

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Récupérer les codes en attente
      const pendingCodes = await warrantyDAO.getPendingCodes(
        interaction.guild.id,
        days,
      );

      if (pendingCodes.length === 0) {
        const embed = new EmbedBuilder()
          .setColor("#ffff00")
          .setTitle("📋 No Pending Warranties")
          .setDescription(
            `No pending warranty codes found in the last ${days} days.`,
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Limiter l'affichage à 25 codes maximum (limite Discord)
      const displayCodes = pendingCodes.slice(0, 25);
      const hasMore = pendingCodes.length > 25;

      // Créer l'embed principal
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`📋 Pending Warranty Codes (${pendingCodes.length} total)`)
        .setDescription(
          `Codes awaiting activation from the last ${days} days.\n` +
          `Use \`/activate-warranty\` to activate them.`
        )
        .setTimestamp();

      // Ajouter les codes par groupes pour éviter de dépasser la limite de caractères
      let currentField = "";
      let fieldCount = 0;
      const maxFieldLength = 1024; // Limite Discord pour un field

      for (let i = 0; i < displayCodes.length; i++) {
        const code = displayCodes[i];
        const createdDate = new Date(code.created_at);
        const linkedDate = code.linked_at ? new Date(code.linked_at) : null;

        let codeInfo = `**${code.code}**\n`;
        
        if (code.product_info) {
          codeInfo += `Product: ${code.product_info}\n`;
        }
        
        codeInfo += `Created: <t:${Math.floor(createdDate.getTime() / 1000)}:R>\n`;
        
        if (linkedDate) {
          codeInfo += `Linked: <t:${Math.floor(linkedDate.getTime() / 1000)}:R>\n`;
        }
        
        if (code.user_id) {
          codeInfo += `User: <@${code.user_id}>\n`;
        } else {
          codeInfo += `Status: Not linked to user\n`;
        }
        
        codeInfo += `\n`;

        // Si ajouter ce code dépasserait la limite, créer un nouveau field
        if (currentField.length + codeInfo.length > maxFieldLength) {
          fieldCount++;
          embed.addFields({
            name:
              fieldCount === 1
                ? "Pending Codes"
                : `Pending Codes (continued ${fieldCount})`,
            value: currentField.trim() || "No codes",
            inline: false,
          });
          currentField = codeInfo;
        } else {
          currentField += codeInfo;
        }
      }

      // Ajouter le dernier field s'il n'est pas vide
      if (currentField.trim()) {
        fieldCount++;
        embed.addFields({
          name:
            fieldCount === 1
              ? "Pending Codes"
              : `Pending Codes (continued ${fieldCount})`,
          value: currentField.trim(),
          inline: false,
        });
      }

      // Ajouter des statistiques
      const linkedCodes = displayCodes.filter(code => code.user_id);
      const unlinkedCodes = displayCodes.filter(code => !code.user_id);

      embed.addFields({
        name: "📊 Statistics",
        value:
          `**Total Pending:** ${pendingCodes.length}\n` +
          `**Linked to Users:** ${linkedCodes.length}\n` +
          `**Not Linked:** ${unlinkedCodes.length}` +
          (hasMore ? `\n**Note:** Only showing first 25 codes` : ""),
        inline: false,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des codes en attente:",
        error,
      );

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Error")
        .setDescription(
          "An error occurred while retrieving pending warranties. Please try again.",
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
