const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure bot settings with interactive menus')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Lire la configuration actuelle

      // Créer l'embed principal
      const configEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚙️ Bot Configuration Manager')
        .setDescription('Use the dropdown menu below to configure different aspects of the bot.')
        .addFields(
          { name: '🎭 Roles', value: 'Configure Discord roles used by the bot', inline: true },
          { name: '📢 Channels', value: 'Configure Discord channels used by the bot', inline: true },
          { name: '📁 Categories', value: 'Configure Discord categories for tickets', inline: true },
          { name: '🤖 Bot Settings', value: 'Configure bot behavior and status', inline: true },
          { name: '🛡️ Warranty Settings', value: 'Configure warranty system parameters', inline: true },
          { name: '🎫 Ticket Settings', value: 'Configure ticket system parameters', inline: true }
        )
        .setFooter({ text: 'Select a category to modify its settings' })
        .setTimestamp();

      // Créer le menu déroulant principal
      const mainMenu = new StringSelectMenuBuilder()
        .setCustomId('config_main_menu')
        .setPlaceholder('Select a configuration category')
        .addOptions([
          {
            label: 'Roles Configuration',
            description: 'Configure Discord roles (Premium, Warranty, Admin, etc.)',
            value: 'roles',
            emoji: '🎭'
          },
          {
            label: 'Channels Configuration',
            description: 'Configure Discord channels (Warranty, Support, Logs, etc.)',
            value: 'channels',
            emoji: '📢'
          },
          {
            label: 'Categories Configuration',
            description: 'Configure Discord categories for ticket organization',
            value: 'categories',
            emoji: '📁'
          },
          {
            label: 'Bot Settings',
            description: 'Configure bot status, prefix, and general behavior',
            value: 'bot',
            emoji: '🤖'
          },
          {
            label: 'Warranty Settings',
            description: 'Configure warranty duration, reminders, and limits',
            value: 'warranty',
            emoji: '🛡️'
          },
          {
            label: 'Ticket Settings',
            description: 'Configure ticket auto-close, limits, and priorities',
            value: 'tickets',
            emoji: '🎫'
          }
        ]);

      const actionRow = new ActionRowBuilder().addComponents(mainMenu);

      await interaction.editReply({
        embeds: [configEmbed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Erreur lors de l\'affichage de la configuration:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred while loading the configuration menu.')
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};
