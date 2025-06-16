// commands/ping.js
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with pong!');

export async function execute(interaction) {
  await interaction.reply('🏓 Pong!');
}
