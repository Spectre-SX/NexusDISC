import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get info about this server'),
  async execute(interaction) {
    const guild = interaction.guild;

    await interaction.reply({
      embeds: [{
        color: 0x3498db,
        title: `${guild.name} Info`,
        thumbnail: { url: guild.iconURL({ dynamic: true }) },
        fields: [
          { name: 'Server ID', value: guild.id, inline: true },
          { name: 'Members', value: `${guild.memberCount}`, inline: true },
          { name: 'Created On', value: guild.createdAt.toDateString(), inline: true },
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Boost Tier', value: guild.premiumTier.toString(), inline: true },
          { name: 'Boost Count', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true },
        ],
      }],
    });
  },
};
