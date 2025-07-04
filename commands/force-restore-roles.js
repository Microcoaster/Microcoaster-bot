const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const warrantyDAO = require('../dao/warrantyDAO');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('force-restore-roles')
    .setDescription('Force restore warranty roles for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose roles to restore')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      await interaction.deferReply({ ephemeral: true });

      if (!member) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ User Not Found')
          .setDescription(`${targetUser.tag} is not a member of this server.`)
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Vérifier si l'utilisateur a une garantie active
      const warranty = await warrantyDAO.getUserWarranty(targetUser.id, interaction.guild.id);
      
      if (!warranty) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ No Active Warranty')
          .setDescription(`${targetUser.tag} does not have an active warranty.`)
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Vérifier si la garantie n'a pas expiré
      const now = new Date();
      const expirationDate = new Date(warranty.expiration_date);
      
      if (expirationDate <= now) {
        const embed = new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('⚠️ Warranty Expired')
          .setDescription(`${targetUser.tag}'s warranty expired on <t:${Math.floor(expirationDate.getTime() / 1000)}:F>. Cannot restore roles for expired warranty.`)
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Récupérer les rôles de garantie depuis la configuration
      const config = require('../config/config.json');
      const warrantyRoleId = config.roles.warranty_role_id;
      const premiumRoleId = config.roles.premium_role_id;

      if (!warrantyRoleId || !premiumRoleId) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Configuration Error')
          .setDescription('Warranty roles are not properly configured. Please contact an administrator.')
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      const warrantyRole = interaction.guild.roles.cache.get(warrantyRoleId);
      const premiumRole = interaction.guild.roles.cache.get(premiumRoleId);

      if (!warrantyRole || !premiumRole) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Roles Not Found')
          .setDescription('One or more warranty roles could not be found. Please check the configuration.')
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      // Restaurer les rôles
      const rolesToAdd = [];
      const rolesRestored = [];

      if (!member.roles.cache.has(warrantyRoleId)) {
        rolesToAdd.push(warrantyRole);
        rolesRestored.push(warrantyRole.name);
      }

      if (!member.roles.cache.has(premiumRoleId)) {
        rolesToAdd.push(premiumRole);
        rolesRestored.push(premiumRole.name);
      }

      if (rolesToAdd.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#ffff00')
          .setTitle('ℹ️ No Action Needed')
          .setDescription(`${targetUser.tag} already has all warranty roles.`)
          .addFields(
            { name: 'Current Roles', value: `${warrantyRole.name}, ${premiumRole.name}`, inline: false },
            { name: 'Warranty Expiration', value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`, inline: false }
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      await member.roles.add(rolesToAdd);

      // Mettre à jour le statut des rôles dans la base de données
      await warrantyDAO.updateRoleStatus(warranty.warranty_id, true);

      // Logger l'action
      await warrantyDAO.logWarrantyAction({
        warranty_id: warranty.warranty_id,
        user_id: targetUser.id,
        guild_id: interaction.guild.id,
        action_type: 'ROLES_RESTORED',
        action_details: `Force restored roles: ${rolesRestored.join(', ')}`,
        performed_by: interaction.user.id
      });

      // Créer l'embed de succès
      const successEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Roles Restored Successfully')
        .setDescription(`Warranty roles have been restored for ${targetUser.tag}.`)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Restored Roles', value: rolesRestored.join(', '), inline: true },
          { name: 'Warranty Expiration', value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`, inline: false },
          { name: 'Restored by', value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      // Envoyer un DM à l'utilisateur
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🔄 Warranty Roles Restored')
          .setDescription('Your MicroCoaster™ warranty roles have been restored by our support team.')
          .addFields(
            { name: 'Restored Access', value: rolesRestored.join(', '), inline: false },
            { name: 'Warranty Valid Until', value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: 'Thank you for choosing MicroCoaster™!' })
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.log(`Impossible d'envoyer un DM à ${targetUser.tag}: ${dmError.message}`);
      }

    } catch (error) {
      console.error('Erreur lors de la restauration forcée des rôles:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred while restoring roles. Please try again.')
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};
