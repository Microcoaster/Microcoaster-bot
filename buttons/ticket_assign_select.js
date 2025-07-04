/**
 * Handler pour le menu de sélection d'assignation de ticket
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const TicketDAO = require('../dao/ticketDAO');
const ticketDAO = new TicketDAO();

module.exports = {
  execute: async (interaction, params = []) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Extraire les paramètres
      const channelId = params[0];
      const ticketId = params[1];
      const assignedUserId = interaction.values[0];

      const guild = interaction.guild;
      const channel = guild.channels.cache.get(channelId);
      const assignedMember = await guild.members.fetch(assignedUserId);

      if (!channel || !assignedMember) {
        return await interaction.editReply({
          content: '❌ Channel or member not found.',
        });
      }

      // Assigner le ticket dans la base de données
      const success = await ticketDAO.assignTicket(ticketId, assignedUserId);
      
      if (success) {
        // Ajouter les permissions au membre assigné
        await channel.permissionOverwrites.create(assignedUserId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          ManageMessages: true
        });

        // Modifier le nom du canal pour indiquer l'assignation
        const assignedName = channel.name.includes('📋') ? channel.name : `📋-${channel.name}`;
        await channel.setName(assignedName);

        // Créer un embed de notification
        const assignEmbed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle('👤 Ticket Assigned')
          .setDescription(`This ticket has been assigned to ${assignedMember}.`)
          .addFields(
            { name: 'Ticket ID', value: ticketId, inline: true },
            { name: 'Assigned by', value: `${interaction.user}`, inline: true },
            { name: 'Assigned to', value: `${assignedMember}`, inline: true }
          )
          .setTimestamp();

        // Envoyer la notification dans le canal du ticket
        await channel.send({ 
          content: `${assignedMember}`, 
          embeds: [assignEmbed] 
        });

        // Confirmer à l'utilisateur
        await interaction.editReply({
          content: `✅ Ticket successfully assigned to ${assignedMember.displayName}!`,
        });

        console.log(`\x1b[38;5;2m📋 Ticket ${ticketId} assigné à ${assignedMember.displayName} par ${interaction.user.username}\x1b[0m`);
      } else {
        await interaction.editReply({
          content: '❌ Failed to assign ticket. Please try again.',
        });
      }

    } catch (error) {
      console.error('Erreur lors de l\'assignation de ticket:', error);
      
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ An error occurred while assigning the ticket.' });
      } else {
        await interaction.reply({ content: '❌ An error occurred while assigning the ticket.', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
