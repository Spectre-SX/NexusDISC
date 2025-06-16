import { SlashCommandBuilder } from 'discord.js';

function rollDice(dice) {
  const [count, sides] = dice.toLowerCase().split('d').map(Number);
  if (!count || !sides) return null;
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  return rolls;
}

export default {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice (like 2d6 or 1d20)')
    .addStringOption(option =>
      option.setName('dice')
        .setDescription('Dice to roll, e.g. 1d20')
        .setRequired(true)),
  async execute(interaction) {
    const dice = interaction.options.getString('dice');
    const rolls = rollDice(dice);
    if (!rolls) return interaction.reply({ content: 'Invalid dice format! Use NdM, e.g. 2d6', ephemeral: true });

    const total = rolls.reduce((a, b) => a + b, 0);
    await interaction.reply(`🎲 You rolled: ${rolls.join(', ')} (Total: ${total})`);
  },
};
