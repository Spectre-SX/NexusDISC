import { 
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  VoiceBasedChannel
} from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';

const queue = new Map(); // guildId => { voiceChannel, connection, player, songs, timeout }

export const data = new SlashCommandBuilder()
  .setName('music')
  .setDescription('Music commands')
  .addSubcommand(sub =>
    sub.setName('connect').setDescription('Join your voice channel'))
  .addSubcommand(sub =>
    sub.setName('disconnect').setDescription('Leave voice channel and clear queue'))
  // You can add play/pause/skip commands here later

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  let serverQueue = queue.get(guildId);

  if (subcommand === 'connect') {
    const memberVoiceChannel = interaction.member.voice.channel;
    if (!memberVoiceChannel) {
      return interaction.reply({ content: 'You need to be in a voice channel first!', ephemeral: true });
    }

    if (serverQueue && serverQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      return interaction.reply({ content: 'Already connected to a voice channel!', ephemeral: true });
    }

    // Join voice channel
    const connection = joinVoiceChannel({
      channelId: memberVoiceChannel.id,
      guildId: guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch {
      connection.destroy();
      return interaction.reply({ content: 'Failed to join voice channel within 20 seconds.', ephemeral: true });
    }

    // Create audio player
    const player = createAudioPlayer();

    connection.subscribe(player);

    // Setup server queue
    queue.set(guildId, {
      voiceChannel: memberVoiceChannel,
      connection,
      player,
      songs: [],
      leaveTimeout: null,
    });

    interaction.reply({ content: `Joined ${memberVoiceChannel.name} and ready to play music! 🎶` });
  }
  else if (subcommand === 'disconnect') {
    if (!serverQueue) {
      return interaction.reply({ content: 'Not connected to any voice channel!', ephemeral: true });
    }

    if (serverQueue.leaveTimeout) {
      clearTimeout(serverQueue.leaveTimeout);
    }

    serverQueue.player.stop();
    serverQueue.connection.destroy();
    queue.delete(guildId);

    interaction.reply({ content: 'Disconnected and cleared the queue. Bye! 👋' });
  }
}

// Play a song function example (call this in your play command logic)
export function playSong(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!serverQueue) return;

  if (!song) {
    // Start leave timer for 45 seconds if no song to play
    serverQueue.leaveTimeout = setTimeout(() => {
      serverQueue.connection.destroy();
      queue.delete(guild.id);
      console.log(`Left voice channel in guild ${guild.id} due to inactivity.`);
    }, 45_000);
    return;
  }

  // If leave timer exists (like was about to leave), cancel it because we got a song now
  if (serverQueue.leaveTimeout) {
    clearTimeout(serverQueue.leaveTimeout);
    serverQueue.leaveTimeout = null;
  }

  const stream = ytdl(song.url, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    },
    dlChunkSize: 0,
  });

  stream.on('error', error => {
    console.error('Stream error:', error);
    serverQueue.songs.shift(); // remove problematic song
    playSong(guild, serverQueue.songs[0]);
  });

  const resource = createAudioResource(stream);

  serverQueue.player.play(resource);

  serverQueue.player.once(AudioPlayerStatus.Idle, () => {
    serverQueue.songs.shift();
    playSong(guild, serverQueue.songs[0]);
  });

  serverQueue.player.once('error', error => {
    console.error('Audio Player Error:', error);
    serverQueue.songs.shift();
    playSong(guild, serverQueue.songs[0]);
  });
}
