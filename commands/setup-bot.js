const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-bot')
    .setDescription('Complete bot setup: creates all roles, channels, categories and configures the entire system')
    .addBooleanOption(option =>
      option.setName('overwrite')
        .setDescription('Overwrite existing roles/channels if they exist')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const overwrite = interaction.options.getBoolean('overwrite') || false;
      
      // Charger la configuration actuelle
      const configPath = path.join(__dirname, '..', 'config', 'config.json');
      let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Mettre à jour le guild_id
      config.guild_id = guild.id;
      
      const createdElements = {
        roles: {},
        channels: {},
        categories: {},
        errors: []
      };

      // Définir les rôles à créer avec leurs propriétés
      const rolesToCreate = {
        premium_role_id: {
          name: 'MicroCoaster™ Premium',
          color: '#FFD700',
          reason: 'Premium users with extended warranty'
        },
        warranty_role_id: {
          name: 'Warranty Active',
          color: '#00FF00',
          reason: 'Users with active warranty'
        },
        admin_role_id: {
          name: 'MicroCoaster™ Admin',
          color: '#FF0000',
          reason: 'Bot administrators',
          permissions: [PermissionFlagsBits.Administrator]
        },
        support_team_role_id: {
          name: 'Support Team',
          color: '#0099FF',
          reason: 'General support team members'
        },
        technical_team_role_id: {
          name: 'Technical Team',
          color: '#9932CC',
          reason: 'Technical support specialists'
        },
        business_team_role_id: {
          name: 'Business Team',
          color: '#228B22',
          reason: 'Business and partnership team'
        },
        recruitment_team_role_id: {
          name: 'Recruitment Team',
          color: '#FF6347',
          reason: 'Recruitment and HR team'
        }
      };

      // Créer les rôles
      const setupEmbed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('🔧 Setting up MicroCoaster™ Bot...')
        .setDescription('Creating roles, channels, and categories. This may take a moment...')
        .setTimestamp();

      await interaction.editReply({ embeds: [setupEmbed] });

      console.log('Starting bot setup process...');

      // Étape 1: Créer les rôles
      for (const [roleKey, roleConfig] of Object.entries(rolesToCreate)) {
        try {
          // Vérifier si le rôle existe déjà
          const existingRole = guild.roles.cache.find(role => role.name === roleConfig.name);
          
          if (existingRole && !overwrite) {
            config.roles[roleKey] = existingRole.id;
            createdElements.roles[roleKey] = { name: roleConfig.name, id: existingRole.id, status: 'existing' };
            console.log(`Role ${roleConfig.name} already exists, using existing role`);
          } else {
            if (existingRole && overwrite) {
              await existingRole.delete('Recreating role during bot setup');
              console.log(`Deleted existing role ${roleConfig.name} for recreation`);
            }

            const role = await guild.roles.create({
              name: roleConfig.name,
              color: roleConfig.color,
              permissions: roleConfig.permissions || [],
              reason: roleConfig.reason
            });

            config.roles[roleKey] = role.id;
            createdElements.roles[roleKey] = { name: roleConfig.name, id: role.id, status: 'created' };
            console.log(`Created role: ${roleConfig.name} (${role.id})`);
          }
        } catch (error) {
          console.error(`Error creating role ${roleConfig.name}:`, error);
          createdElements.errors.push(`Failed to create role ${roleConfig.name}: ${error.message}`);
        }
      }

      // Étape 2: Créer les catégories
      const categoriesToCreate = {
        technical_category_id: {
          name: '🛠️ TECHNICAL SUPPORT',
          reason: 'Category for technical support tickets'
        },
        product_category_id: {
          name: '🔧 PRODUCT SUPPORT',
          reason: 'Category for product support tickets'
        },
        business_category_id: {
          name: '💼 BUSINESS INQUIRIES',
          reason: 'Category for business and partnership tickets'
        },
        recruitment_category_id: {
          name: '👥 RECRUITMENT',
          reason: 'Category for recruitment and job application tickets'
        }
      };

      for (const [categoryKey, categoryConfig] of Object.entries(categoriesToCreate)) {
        try {
          // Vérifier si la catégorie existe déjà
          const existingCategory = guild.channels.cache.find(
            channel => channel.type === ChannelType.GuildCategory && channel.name === categoryConfig.name
          );

          if (existingCategory && !overwrite) {
            config.categories[categoryKey] = existingCategory.id;
            createdElements.categories[categoryKey] = { name: categoryConfig.name, id: existingCategory.id, status: 'existing' };
            console.log(`Category ${categoryConfig.name} already exists, using existing category`);
          } else {
            if (existingCategory && overwrite) {
              await existingCategory.delete('Recreating category during bot setup');
              console.log(`Deleted existing category ${categoryConfig.name} for recreation`);
            }

            const category = await guild.channels.create({
              name: categoryConfig.name,
              type: ChannelType.GuildCategory,
              reason: categoryConfig.reason
            });

            config.categories[categoryKey] = category.id;
            createdElements.categories[categoryKey] = { name: categoryConfig.name, id: category.id, status: 'created' };
            console.log(`Created category: ${categoryConfig.name} (${category.id})`);
          }
        } catch (error) {
          console.error(`Error creating category ${categoryConfig.name}:`, error);
          createdElements.errors.push(`Failed to create category ${categoryConfig.name}: ${error.message}`);
        }
      }

      // Étape 3: Créer les channels
      const channelsToCreate = {
        warranty_activation_channel_id: {
          name: '🎫-warranty-activation',
          reason: 'Channel for warranty activation',
          type: ChannelType.GuildText
        },
        support_channel_id: {
          name: '🎫-support',
          reason: 'Main support channel with ticket creation buttons',
          type: ChannelType.GuildText
        },
        logs_moderation_channel_id: {
          name: '📋-moderation-logs',
          reason: 'Channel for moderation logs',
          type: ChannelType.GuildText
        },
        bot_stats_channel_id: {
          name: '📊-bot-stats',
          reason: 'Channel for bot statistics and status',
          type: ChannelType.GuildText
        },
        role_logs_channel_id: {
          name: '📝-role-logs',
          reason: 'Channel for role assignment logs',
          type: ChannelType.GuildText
        }
      };

      for (const [channelKey, channelConfig] of Object.entries(channelsToCreate)) {
        try {
          // Vérifier si le channel existe déjà
          const existingChannel = guild.channels.cache.find(
            channel => channel.type === channelConfig.type && channel.name === channelConfig.name
          );

          if (existingChannel && !overwrite) {
            config.channels[channelKey] = existingChannel.id;
            createdElements.channels[channelKey] = { name: channelConfig.name, id: existingChannel.id, status: 'existing' };
            console.log(`Channel ${channelConfig.name} already exists, using existing channel`);
          } else {
            if (existingChannel && overwrite) {
              await existingChannel.delete('Recreating channel during bot setup');
              console.log(`Deleted existing channel ${channelConfig.name} for recreation`);
            }

            // Définir les permissions spéciales pour certains channels
            let permissionOverwrites = [];
            
            if (channelKey === 'support_channel_id') {
              // Channel de support: visible par tous, mais seuls les membres peuvent écrire
              permissionOverwrites = [
                {
                  id: guild.roles.everyone.id,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                  deny: [PermissionFlagsBits.SendMessages]
                }
              ];
            } else if (channelKey.includes('logs')) {
              // Channels de logs: visible seulement par l'équipe de support et admins
              permissionOverwrites = [
                {
                  id: guild.roles.everyone.id,
                  deny: [PermissionFlagsBits.ViewChannel]
                }
              ];
              
              // Ajouter les permissions pour les rôles de support si ils existent
              if (config.roles.support_team_role_id) {
                permissionOverwrites.push({
                  id: config.roles.support_team_role_id,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                });
              }
              if (config.roles.admin_role_id) {
                permissionOverwrites.push({
                  id: config.roles.admin_role_id,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                });
              }
            }

            const channel = await guild.channels.create({
              name: channelConfig.name,
              type: channelConfig.type,
              permissionOverwrites: permissionOverwrites,
              reason: channelConfig.reason
            });

            config.channels[channelKey] = channel.id;
            createdElements.channels[channelKey] = { name: channelConfig.name, id: channel.id, status: 'created' };
            console.log(`Created channel: ${channelConfig.name} (${channel.id})`);
          }
        } catch (error) {
          console.error(`Error creating channel ${channelConfig.name}:`, error);
          createdElements.errors.push(`Failed to create channel ${channelConfig.name}: ${error.message}`);
        }
      }

      // Étape 4: Configurer le système de tickets dans le support channel
      if (config.channels.support_channel_id) {
        try {
          const supportChannel = guild.channels.cache.get(config.channels.support_channel_id);
          
          if (supportChannel) {
            // Créer l'embed principal pour le système de tickets
            const ticketEmbed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('🎫 MicroCoaster™ Support System')
              .setDescription('Welcome to our support system! Click one of the buttons below to open a support ticket.')
              .addFields(
                {
                  name: '🛠️ Technical Support',
                  value: 'Need help with installation, setup, or technical issues? Get assistance from our technical team.',
                  inline: false
                },
                {
                  name: '🔧 Product Support',
                  value: 'Questions about your MicroCoaster™ product, parts, or general usage? Our product experts are here to help.',
                  inline: false
                },
                {
                  name: '💼 Business Inquiry',
                  value: 'Interested in bulk orders, partnerships, or custom solutions? Connect with our business team.',
                  inline: false
                },
                {
                  name: '👥 Join Our Team',
                  value: 'Interested in joining the MicroCoaster™ team? Open a ticket to discuss opportunities.',
                  inline: false
                }
              )
              .setFooter({ text: 'Your ticket will be handled by our support team as soon as possible.' })
              .setTimestamp();

            // Créer les boutons pour chaque type de ticket
            const buttonRow = new ActionRowBuilder()
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

            // Envoyer le message dans le canal de support
            await supportChannel.send({
              embeds: [ticketEmbed],
              components: [buttonRow]
            });

            console.log('Ticket system panel created in support channel');
          }
        } catch (error) {
          console.error('Error setting up ticket system:', error);
          createdElements.errors.push(`Failed to set up ticket system: ${error.message}`);
        }
      }

      // Étape 5: Sauvegarder la configuration
      try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('Configuration saved successfully');
      } catch (error) {
        console.error('Error saving configuration:', error);
        createdElements.errors.push(`Failed to save configuration: ${error.message}`);
      }

      // Créer le message de résumé
      const summaryEmbed = new EmbedBuilder()
        .setColor(createdElements.errors.length > 0 ? '#FFAA00' : '#00FF00')
        .setTitle('✅ MicroCoaster™ Bot Setup Complete!')
        .setDescription('The bot has been successfully configured on your server.')
        .setTimestamp();

      // Ajouter les rôles créés
      if (Object.keys(createdElements.roles).length > 0) {
        const rolesText = Object.values(createdElements.roles)
          .map(role => `${role.status === 'created' ? '🆕' : '♻️'} ${role.name}`)
          .join('\n');
        summaryEmbed.addFields({ name: '👥 Roles', value: rolesText, inline: true });
      }

      // Ajouter les catégories créées
      if (Object.keys(createdElements.categories).length > 0) {
        const categoriesText = Object.values(createdElements.categories)
          .map(cat => `${cat.status === 'created' ? '🆕' : '♻️'} ${cat.name}`)
          .join('\n');
        summaryEmbed.addFields({ name: '📁 Categories', value: categoriesText, inline: true });
      }

      // Ajouter les channels créés
      if (Object.keys(createdElements.channels).length > 0) {
        const channelsText = Object.values(createdElements.channels)
          .map(ch => `${ch.status === 'created' ? '🆕' : '♻️'} ${ch.name}`)
          .join('\n');
        summaryEmbed.addFields({ name: '📺 Channels', value: channelsText, inline: true });
      }

      // Ajouter les infos importantes
      summaryEmbed.addFields(
        { name: '🎫 Ticket System', value: 'Configured in the support channel', inline: false },
        { name: '⚙️ Configuration', value: 'All IDs saved to config.json', inline: false }
      );

      // Ajouter les erreurs s'il y en a
      if (createdElements.errors.length > 0) {
        const errorsText = createdElements.errors.slice(0, 5).join('\n');
        summaryEmbed.addFields({ 
          name: '⚠️ Warnings/Errors', 
          value: errorsText + (createdElements.errors.length > 5 ? '\n... and more' : ''), 
          inline: false 
        });
      }

      summaryEmbed.addFields({
        name: '🚀 Next Steps',
        value: '• Use `/config` to modify any settings\n• Use `/config-view` to view current configuration\n• Test the ticket system in the support channel\n• Assign team roles to your staff members',
        inline: false
      });

      await interaction.editReply({ embeds: [summaryEmbed] });

      // Log final results
      console.log('Bot setup completed!');
      console.log('Created:', {
        roles: Object.keys(createdElements.roles).length,
        categories: Object.keys(createdElements.categories).length,
        channels: Object.keys(createdElements.channels).length,
        errors: createdElements.errors.length
      });

    } catch (error) {
      console.error('Critical error during bot setup:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Setup Failed')
        .setDescription('A critical error occurred during bot setup. Please check bot permissions and try again.')
        .addFields({
          name: 'Error Details',
          value: error.message.slice(0, 1000),
          inline: false
        })
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};
