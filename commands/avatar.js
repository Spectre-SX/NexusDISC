import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption(option => option.setName('target').setDescription('User').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('target') || interaction.user;
    await interaction.reply({ content: user.displayAvatarURL({ dynamic: true, size: 1024 }) });
  },
};
