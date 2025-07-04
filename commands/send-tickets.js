/**
 * Commande pour envoyer le panneau de tickets sans setup complet
 * Cette commande permet d'envoyer uniquement les boutons de tickets
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send-tickets')
    .setDescription('Send the ticket support panel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send the ticket panel (current channel if not specified)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Récupérer le canal cible
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      // Vérifier que le bot peut écrire dans le canal
      if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        return await interaction.editReply({
          content: `❌ I don't have permission to send messages in ${targetChannel}.`
        });
      }

      // Créer l'embed principal
      const ticketEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('🎫 MicroCoaster™ Support Center')
        .setDescription(`Welcome to our support center! Select the category that best matches your inquiry below.

**📋 Before creating a ticket:**
• Check our FAQ and documentation first
• Make sure you have all relevant information ready
• Be as detailed as possible in your description

Choose your support category:`)
        .setThumbnail('https://ptero.yamakajump-crew.fr/extensions/resourcemanager/uploads/1751636055_logo.png')
        .setFooter({ 
          text: 'MicroCoaster™ Support • Our team is here to help you!',
          iconURL: 'https://ptero.yamakajump-crew.fr/extensions/resourcemanager/uploads/1751636055_logo.png'
        });

      // Créer les boutons de tickets
      const ticketButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_technical')
            .setLabel('Technical Support')
            .setEmoji('🛠️')
            .setStyle(ButtonStyle.Primary),
          
          new ButtonBuilder()
            .setCustomId('ticket_product')
            .setLabel('Product Support')
            .setEmoji('🔧')
            .setStyle(ButtonStyle.Success),
          
          new ButtonBuilder()
            .setCustomId('ticket_business')
            .setLabel('Business Inquiry')
            .setEmoji('💼')
            .setStyle(ButtonStyle.Secondary),
          
          new ButtonBuilder()
            .setCustomId('ticket_recruitment')
            .setLabel('Join Our Team')
            .setEmoji('👥')
            .setStyle(ButtonStyle.Danger)
        );

      // Envoyer le message dans le canal cible
      const sentMessage = await targetChannel.send({
        embeds: [ticketEmbed],
        components: [ticketButtons]
      });

      // Confirmer l'envoi
      const confirmEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Ticket Panel Sent')
        .setDescription(`The ticket support panel has been sent successfully!`)
        .addFields(
          { name: 'Channel', value: `${targetChannel}`, inline: true },
          { name: 'Message ID', value: sentMessage.id, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [confirmEmbed] });

    } catch (error) {
      console.error('Erreur lors de l\'envoi du panneau de tickets:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred while sending the ticket panel.')
        .addFields(
          { name: 'Error', value: error.message, inline: false }
        )
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
