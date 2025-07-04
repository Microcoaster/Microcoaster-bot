const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const WarrantyDAO = require('../dao/warrantyDAO');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warranty-check')
        .setDescription('🔍 [STAFF] Check warranty status of a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(true)),

    async execute(interaction) {
        try {
            // Vérification des permissions (Admin, Modérateur, Support, ou Garantie Manager)
            const allowedRoles = ['👑 Admin', '🛠️ Modérateur', '💼 Support', '📋 Garantie Manager'];
            const hasPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
                interaction.member.roles.cache.some(role => allowedRoles.includes(role.name));

            if (!hasPermission) {
                return await interaction.reply({
                    content: '❌ You need staff permissions to use this command.',
                    ephemeral: true
                });
            }

            const targetUser = interaction.options.getUser('user');
            await interaction.deferReply({ ephemeral: true });

            const warrantyDAO = new WarrantyDAO();

            try {
                // Récupérer le statut de l'utilisateur
                const userStatus = await warrantyDAO.checkUserStatus(targetUser.id);
                
                // Récupérer les informations du membre Discord
                let member = null;
                try {
                    member = await interaction.guild.members.fetch(targetUser.id);
                } catch {
                    // L'utilisateur n'est plus sur le serveur
                }

                // Calculer les jours restants si garantie active
                let daysRemaining = 0;
                if (userStatus.has_warranty && userStatus.warranty_expires_at) {
                    const now = new Date();
                    const expiration = new Date(userStatus.warranty_expires_at);
                    daysRemaining = Math.max(0, Math.ceil((expiration - now) / (1000 * 60 * 60 * 24)));
                }

                // Déterminer la couleur de l'embed
                let embedColor = '#ff0000'; // Rouge par défaut
                if (userStatus.has_warranty && daysRemaining > 30) {
                    embedColor = '#00ff00'; // Vert
                } else if (userStatus.has_warranty && daysRemaining > 7) {
                    embedColor = '#ff9900'; // Orange
                } else if (userStatus.has_premium) {
                    embedColor = '#0099ff'; // Bleu
                }

                // Créer l'embed de statut
                const statusEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle('🔍 Warranty Status Check')
                    .setDescription(`Status report for **${targetUser.tag}**`)
                    .addFields(
                        { 
                            name: '👤 User Info', 
                            value: `<@${targetUser.id}>\nID: \`${targetUser.id}\``, 
                            inline: true 
                        },
                        { 
                            name: '📊 Server Status', 
                            value: member ? '✅ In Server' : '❌ Not in Server', 
                            inline: true 
                        },
                        { 
                            name: '🎖️ Premium Status', 
                            value: userStatus.has_premium ? '✅ Active' : '❌ Inactive', 
                            inline: true 
                        },
                        { 
                            name: '🔗 Code Linked', 
                            value: userStatus.code_linked ? '✅ Yes' : '❌ No', 
                            inline: true 
                        },
                        { 
                            name: '🛡️ Warranty Status', 
                            value: userStatus.has_warranty ? '✅ Active' : '❌ Inactive', 
                            inline: true 
                        }
                    )
                    .setFooter({ 
                        text: `Checked by ${interaction.user.tag} • MicroCoaster™`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp();

                // Ajouter les informations de garantie si active
                if (userStatus.has_warranty && userStatus.warranty_expires_at) {
                    const expirationDate = new Date(userStatus.warranty_expires_at);
                    let statusText = '';
                    
                    if (daysRemaining > 30) {
                        statusText = `${daysRemaining} days remaining`;
                    } else if (daysRemaining > 7) {
                        statusText = `⚠️ ${daysRemaining} days remaining (expiring soon)`;
                    } else if (daysRemaining > 0) {
                        statusText = `🚨 ${daysRemaining} days remaining (critical)`;
                    } else {
                        statusText = '🔴 Expired';
                    }

                    statusEmbed.addFields(
                        { 
                            name: '⏰ Warranty Expires', 
                            value: expirationDate.toLocaleDateString(), 
                            inline: true 
                        },
                        { 
                            name: '📅 Days Remaining', 
                            value: statusText, 
                            inline: true 
                        }
                    );
                }

                // Ajouter les rôles actuels si l'utilisateur est sur le serveur
                if (member) {
                    const relevantRoles = member.roles.cache
                        .filter(role => ['🎖️ Premium', '🛡️ Garantie Active'].includes(role.name))
                        .map(role => role.name);
                    
                    if (relevantRoles.length > 0) {
                        statusEmbed.addFields({
                            name: '🏷️ Current Roles',
                            value: relevantRoles.join(', '),
                            inline: false
                        });
                    }
                }

                // Ajouter une note si il y a des incohérences
                const discrepancies = [];
                if (member) {
                    const hasPremiumRole = member.roles.cache.some(role => role.name === '🎖️ Premium');
                    const hasWarrantyRole = member.roles.cache.some(role => role.name === '🛡️ Garantie Active');
                    
                    if (userStatus.has_premium && !hasPremiumRole) {
                        discrepancies.push('Missing Premium role');
                    }
                    if (!userStatus.has_premium && hasPremiumRole) {
                        discrepancies.push('Has Premium role but not in database');
                    }
                    if (userStatus.has_warranty && !hasWarrantyRole) {
                        discrepancies.push('Missing Warranty role');
                    }
                    if (!userStatus.has_warranty && hasWarrantyRole) {
                        discrepancies.push('Has Warranty role but not active in database');
                    }
                }

                if (discrepancies.length > 0) {
                    statusEmbed.addFields({
                        name: '⚠️ Discrepancies Found',
                        value: discrepancies.join('\n'),
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [statusEmbed] });

            } catch (dbError) {
                console.error('Database error in warranty-check:', dbError);
                
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Database Error')
                    .setDescription('Could not retrieve user status from the database.')
                    .setFooter({ text: 'Please try again later or contact the developer.' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Error in warranty-check command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ System Error')
                .setDescription('A system error occurred while checking the warranty status.')
                .setFooter({ text: 'Please contact the developer if this persists.' })
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
