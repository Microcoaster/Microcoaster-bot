const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const WarrantyDAO = require('../dao/warrantyDAO');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activate-warranty')
        .setDescription('🛡️ [ADMIN] Activate warranty for a specific code')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('The premium/warranty code to activate')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Vérification des permissions admin
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: '❌ You need Administrator permissions to use this command.',
                    ephemeral: true
                });
            }

            const code = interaction.options.getString('code');
            const adminId = interaction.user.id;

            await interaction.deferReply({ ephemeral: true });

            const warrantyDAO = new WarrantyDAO();

            try {
                // Activer la garantie
                const result = await warrantyDAO.activateWarranty(code, adminId);
                
                // Récupérer l'utilisateur Discord
                const user = await interaction.guild.members.fetch(result.userId);
                
                if (user) {
                    // Donner le rôle Garantie Active
                    const warrantyRole = interaction.guild.roles.cache.find(role => role.name === '🛡️ Garantie Active');
                    if (warrantyRole) {
                        await user.roles.add(warrantyRole);
                    }

                    // Donner aussi le rôle Premium si pas déjà présent
                    const premiumRole = interaction.guild.roles.cache.find(role => role.name === '🎖️ Premium');
                    if (premiumRole && !user.roles.cache.has(premiumRole.id)) {
                        await user.roles.add(premiumRole);
                    }

                    // Créer l'embed de confirmation pour l'admin
                    const adminEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Warranty Activated Successfully')
                        .setDescription(`Warranty has been activated for code: \`${code}\``)
                        .addFields(
                            { name: '👤 User', value: `${user.user.tag} (<@${result.userId}>)`, inline: true },
                            { name: '📅 Activation Date', value: new Date().toLocaleDateString(), inline: true },
                            { name: '⏰ Expires On', value: result.expirationDate.toLocaleDateString(), inline: true },
                            { name: '👨‍💼 Activated By', value: `<@${adminId}>`, inline: true }
                        )
                        .setFooter({ text: 'MicroCoaster™ Warranty System' })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [adminEmbed] });

                    // Envoyer un message privé à l'utilisateur
                    try {
                        const userEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('🛡️ Warranty Activated!')
                            .setDescription(`Great news! Your **MicroCoaster™** warranty has been activated by our team.`)
                            .addFields(
                                { name: '📅 Activation Date', value: new Date().toLocaleDateString(), inline: true },
                                { name: '⏰ Valid Until', value: result.expirationDate.toLocaleDateString(), inline: true },
                                { name: '🎯 Coverage', value: '1 year full warranty on your 3D printed microcoasters', inline: false },
                                { name: '📞 Support', value: 'Use our support system in the Discord server if you need assistance', inline: false }
                            )
                            .setFooter({ text: 'MicroCoaster™ • Thank you for your purchase!' })
                            .setTimestamp();

                        await user.send({ embeds: [userEmbed] });
                    } catch (dmError) {
                        console.log(`Could not send DM to user ${result.userId}:`, dmError.message);
                    }

                } else {
                    // L'utilisateur n'est plus sur le serveur
                    const warningEmbed = new EmbedBuilder()
                        .setColor('#ff9900')
                        .setTitle('⚠️ Warranty Activated with Warning')
                        .setDescription(`Warranty has been activated for code: \`${code}\`\n\n**Warning:** The user is no longer in this server. The warranty will be activated when they rejoin.`)
                        .addFields(
                            { name: '👤 User ID', value: result.userId, inline: true },
                            { name: '📅 Activation Date', value: new Date().toLocaleDateString(), inline: true },
                            { name: '⏰ Expires On', value: result.expirationDate.toLocaleDateString(), inline: true }
                        )
                        .setFooter({ text: 'MicroCoaster™ Warranty System' })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [warningEmbed] });
                }

            } catch (warrantyError) {
                let errorMessage = 'An unknown error occurred.';
                
                if (warrantyError.message.includes('Code not found')) {
                    errorMessage = 'The specified code does not exist in the database.';
                } else if (warrantyError.message.includes('not linked')) {
                    errorMessage = 'This code has not been linked to any user yet.';
                } else if (warrantyError.message.includes('already activated')) {
                    errorMessage = 'The warranty for this code is already activated.';
                }

                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Warranty Activation Failed')
                    .setDescription(errorMessage)
                    .addFields(
                        { name: '🔍 Code Checked', value: `\`${code}\``, inline: true },
                        { name: '💡 Suggestion', value: 'Verify the code exists and is properly linked to a user.', inline: false }
                    )
                    .setFooter({ text: 'MicroCoaster™ Warranty System' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Error in activate-warranty command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ System Error')
                .setDescription('A system error occurred while processing the warranty activation.')
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
