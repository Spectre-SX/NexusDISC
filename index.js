import express from 'express';
import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// --- Express server for Render port detection ---
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Nexus bot is online 🔥');
});

app.listen(port, () => {
  console.log(`🌐 Web server listening on port ${port}`);
});

// --- Discord bot setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Dynamically read command files from commands/ folder
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  // command should export { data, execute }
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}! Nexus is online!`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
