const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-warranty")
    .setDescription(
      "🔧 [ADMIN] Setup the warranty activation system in the current channel",
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

      // Récupérer la configuration
      const ConfigManager = require("../utils/configManager");
      const config = ConfigManager.getInstance().getConfig();
      const supportChannelId = config.support_channel_id;
      const supportChannelMention =
        supportChannelId && supportChannelId !== "YOUR_SUPPORT_CHANNEL_ID"
          ? `<#${supportChannelId}>`
          : "the support channel"; // Créer l'embed principal
      const warrantyEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("📦 Premium Code Activation")
        .setDescription(
          `Welcome to **MicroCoaster™** warranty activation system!

**How it works:**
🔹 **Step 1:** Enter your premium code using the button below
🔹 **Step 2:** The system will automatically give you the Premium role and the Warranty role
🔹 **Step 3:** If you don't receive your roles, ask the staff to activate your code

**Your Benefits:**
🎖️ **Premium Role:** Access to exclusive channels and features
🛡️ **Warranty Protection:** Enjoy a 1 year warranty

**Need Help?** 
If your role isn't automatically assigned or you encounter issues, please contact an administrator or use our support system in ${supportChannelMention}.`,
        )
        .addFields(
          {
            name: "🎯 Instructions",
            value:
              "Click the button below to activate your premium code. The Premium role should be assigned automatically.",
            inline: false,
          },
          {
            name: "⚠️ Important",
            value:
              "Each code can only be used once. If the automatic role assignment fails, please contact an admin immediately.",
            inline: false,
          },
        )
        .setFooter({
          text: "MicroCoaster™ • Premium Warranty System",
          iconURL: interaction.guild.iconURL(),
        })
        .setTimestamp();

      // Créer le bouton d'activation
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("activate_premium_code")
          .setLabel("Activate my code")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("📋"),
      );

      // Envoyer le message avec l'embed et le bouton
      await interaction.reply({
        embeds: [warrantyEmbed],
        components: [actionRow],
      });
    } catch (error) {
      console.error("Error in setup-warranty command:", error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ An error occurred while setting up the warranty system.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while setting up the warranty system.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
