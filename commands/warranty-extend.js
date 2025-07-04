const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const warrantyDAO = require('../dao/warrantyDAO');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warranty-extend')
    .setDescription('Extend a user\'s warranty period')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose warranty to extend')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('months')
        .setDescription('Number of months to extend the warranty')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(24))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for extending the warranty')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      const months = interaction.options.getInteger('months');
      const reason = interaction.options.getString('reason') || 'Extended by staff';

      await interaction.deferReply({ ephemeral: true });

      // Vérifier si l'utilisateur a une garantie active
      const warranty = await warrantyDAO.getUserWarranty(targetUser.id, interaction.guild.id);
      
      if (!warranty) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Warranty Not Found')
          .setDescription(`${targetUser.tag} does not have an active warranty.`)
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Calculer la nouvelle date d'expiration
      const currentExpiration = new Date(warranty.expiration_date);
      const newExpiration = new Date(currentExpiration);
      newExpiration.setMonth(newExpiration.getMonth() + months);

      // Mettre à jour la garantie
      await warrantyDAO.extendWarranty(warranty.warranty_id, newExpiration);

      // Logger l'action
      await warrantyDAO.logWarrantyAction({
        warranty_id: warranty.warranty_id,
        user_id: targetUser.id,
        guild_id: interaction.guild.id,
        action_type: 'EXTENDED',
        action_details: `Extended by ${months} months. Reason: ${reason}`,
        performed_by: interaction.user.id
      });

      // Créer l'embed de confirmation
      const successEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Warranty Extended Successfully')
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Extension', value: `${months} months`, inline: true },
          { name: 'New Expiration', value: `<t:${Math.floor(newExpiration.getTime() / 1000)}:F>`, inline: false },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Extended by', value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      // Envoyer un DM à l'utilisateur
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🎉 Warranty Extended')
          .setDescription('Great news! Your MicroCoaster™ warranty has been extended.')
          .addFields(
            { name: 'Extension', value: `${months} additional months`, inline: true },
            { name: 'New Expiration Date', value: `<t:${Math.floor(newExpiration.getTime() / 1000)}:F>`, inline: false },
            { name: 'Reason', value: reason, inline: false }
          )
          .setFooter({ text: 'Thank you for choosing MicroCoaster™!' })
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.log(`Impossible d'envoyer un DM à ${targetUser.tag}: ${dmError.message}`);
      }

    } catch (error) {
      console.error('Erreur lors de l\'extension de garantie:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred while extending the warranty. Please try again.')
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};
