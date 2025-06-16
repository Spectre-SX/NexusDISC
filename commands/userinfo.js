import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get info about a user')
    .addUserOption(option => option.setName('target').setDescription('User to get info about').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('target') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);

    await interaction.reply({
      embeds: [{
        color: 0x00ff00,
        title: `${user.tag}'s Info`,
        thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
        fields: [
          { name: 'ID', value: user.id, inline: true },
          { name: 'Joined Server', value: member.joinedAt.toDateString(), inline: true },
          { name: 'Account Created', value: user.createdAt.toDateString(), inline: true },
          { name: 'Roles', value: member.roles.cache.map(r => r.name).filter(name => name !== '@everyone').join(', ') || 'None' }
        ],
      }],
    });
  },
};
