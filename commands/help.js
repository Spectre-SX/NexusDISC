import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists all commands'),
  async execute(interaction) {
    await interaction.reply({
      embeds: [{
        title: 'Bot Commands',
        description: `
        /ping - test latency\n
        /userinfo - user info\n
        /guess - guessing game\n
        /serverinfo - server info\n
        /roll [dice] - roll dice\n
        /joke - tell a joke\n
        /8ball [question] - magic 8-ball\n
        /avatar - get avatar\n
        /help - this message
        `,
        color: 0x7289da,
      }],
      ephemeral: true,
    });
  },
};
