// deploy-commands.js
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

// commands here
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with pong 🏓'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log('🌍 Registering global commands...');
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log('✅ Global commands registered! It may take up to 1 hour to appear.');
} catch (error) {
  console.error('❌ Error registering commands:', error);
}
