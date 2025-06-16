import express from 'express';
import { Client, GatewayIntentBits, Collection, Events, REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// --- Web Server for Render ---
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Nexus bot is online 🔥'));
app.listen(port, () => console.log(`🌐 Web server listening on port ${port}`));

// --- Discord Bot Setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
client.commands = new Collection();

// Load commands
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  client.commands.set(command.data.name, command);
}

// Auto-register commands on startup
async function registerCommands() {
  const commands = [];
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    commands.push(command.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔁 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered!');
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
  }
}

// Start the bot
await registerCommands();

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}! Nexus is online!`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '❌ There was an error executing that command!', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
