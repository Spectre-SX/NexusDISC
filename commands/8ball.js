import { SlashCommandBuilder } from 'discord.js';

const answers = [
  'It is certain.', 'Without a doubt.', 'You may rely on it.',
  'Ask again later.', 'Cannot predict now.', 'Don’t count on it.',
  'My reply is no.', 'Very doubtful.', 'Signs point to yes.',
  'Better not tell you now.'
];

export default {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a yes/no question')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Your yes/no question')
        .setRequired(true)),
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const answer = answers[Math.floor(Math.random() * answers.length)];
    await interaction.reply(`🎱 Question: ${question}\nAnswer: ${answer}`);
  },
};
