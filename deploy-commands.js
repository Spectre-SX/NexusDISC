import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_TOKEN;           // You dont got this
const clientId = process.env.CLIENT_ID;            // You dont got this
const guildId = process.env.GUILD_ID;              // You dont got this

if (!token || !clientId || !guildId) {
  console.error('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in environment variables.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.resolve('./commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const commandModule = await import(`file://${filePath}`);
  const command = commandModule.default;
  if ('data' in command && 'toJSON' in command.data) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`Command at ${file} is missing 'data' or 'toJSON' method.`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (slash) commands.`);

    // Register commands to a single guild (for testing)
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} guild commands.`);
  } catch (error) {
    console.error(error);
  }
})();
