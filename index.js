// VERSION BETA - ONLY SUBMITS COMMANDS TO ONE SERVER

import express from 'express';
import { Client, GatewayIntentBits, Collection, Events, REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// === Start Web Server (for Render pinging) ===
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Nexus bot is online 🔥');
});

app.listen(port, () => {
  console.log(`🌐 Web server listening on port ${port}`);
});

// === Create Discord Client ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// === Load Commands from /commands folder ===
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const commandModule = await import(`file://${filePath}`);
  const command = commandModule.default;

  if (!command?.data?.name || typeof command.execute !== 'function') {
    console.warn(`⚠️ Skipping '${file}' - invalid command structure`);
    continue;
  }

  client.commands.set(command.data.name, command);
}

// === Register Slash Commands Per-Guild ===
async function registerCommands() {
  const commands = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = await import(`file://${filePath}`);
    const command = commandModule.default;

    if (!command?.data?.toJSON) {
      console.warn(`⚠️ Skipping '${file}' during registration`);
      continue;
    }

    commands.push(command.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔁 Registering GUILD slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered to GUILD!');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
}

// === Event: Bot is Ready ===
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}! Nexus is online!`);
});

// === Event: Command Interaction ===
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Error executing command:', error);
    try {
      await interaction.reply({
        content: 'There was an error executing this command 😢',
        ephemeral: true,
      });
    } catch (err) {
      console.error('⚠️ Failed to send error reply:', err);
    }
  }
});

// === Start Everything ===
await registerCommands();
client.login(process.env.DISCORD_TOKEN);
