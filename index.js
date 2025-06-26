import express from 'express';
import { config } from 'dotenv';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

config(); // Load .env variables

const app = express();
app.get('/', (req, res) => {
  res.send('Bot is live!');
});
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Setup slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with pong'),
  new SlashCommandBuilder()
    .setName('coin')
    .setDescription('RugPlay coin lookup')
    .addStringOption(option =>
      option.setName('symbol').setDescription('Coin symbol').setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('🟢 Slash commands registered.');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'coin') {
    const symbol = options.getString('symbol');
    // fake response for now:
    await interaction.reply(`Searching RugPlay for **${symbol}**...`);
    // TODO: fetch actual data from RugPlay API here
  }
});

client.login(process.env.TOKEN);
