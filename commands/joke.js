import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';

export default {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Tells you a random joke'),
  async execute(interaction) {
    try {
      const res = await fetch('https://official-joke-api.appspot.com/jokes/random');
      const joke = await res.json();
      await interaction.reply(`${joke.setup}\n\n${joke.punchline}`);
    } catch {
      await interaction.reply('Could not fetch a joke at the moment, try again later!');
    }
  },
};
