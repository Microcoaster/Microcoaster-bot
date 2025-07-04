const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-warranty')
        .setDescription('🔧 [ADMIN] Setup the warranty activation system in the current channel')
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

            // Récupérer la configuration
            const config = require('../config/config.json');
            const supportChannelId = config.support_channel_id;
            const supportChannelMention = supportChannelId && supportChannelId !== 'YOUR_SUPPORT_CHANNEL_ID' 
                ? `<#${supportChannelId}>` 
                : 'the support channel';

            // Créer l'embed principal
            const warrantyEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📦 Premium Code Activation')
                .setDescription(`Welcome to **MicroCoaster™** warranty activation system!

**How it works:**
🔹 **Step 1:** Activate your premium code to get the Premium role
🔹 **Step 2:** An admin will activate your warranty to get the Warranty Active role

**Your Benefits:**
🎖️ **Premium Role:** Access to exclusive channels and features
🛡️ **Warranty Active:** 1-year warranty protection for your 3D printed microcoasters

**Need Help?** 
Use our support system in ${supportChannelMention} if you encounter any issues.`)
                .addFields(
                    {
                        name: '🎯 Instructions',
                        value: 'Click the button below to activate your premium code.',
                        inline: false
                    },
                    {
                        name: '⚠️ Important',
                        value: 'Each code can only be used once. Make sure you have your code ready before clicking.',
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'MicroCoaster™ • Premium Warranty System',
                    iconURL: interaction.guild.iconURL() 
                })
                .setTimestamp();

            // Créer le bouton d'activation
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('activate_premium_code')
                        .setLabel('📋 Activate my code')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📋')
                );

            // Envoyer le message avec l'embed et le bouton
            await interaction.reply({
                embeds: [warrantyEmbed],
                components: [actionRow]
            });

        } catch (error) {
            console.error('Error in setup-warranty command:', error);
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ An error occurred while setting up the warranty system.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while setting up the warranty system.',
                    ephemeral: true
                });
            }
        }
    },
};
