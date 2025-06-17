import Discord from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
  getVoiceConnection,
  VoiceConnectionDisconnectReason,
  entersState as entersStateVoice,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import ytSearch from 'yt-search';

const { SlashCommandBuilder } = Discord;

const queue = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music commands')
    .addSubcommand(sub =>
      sub
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(opt => opt.setName('query').setDescription('Song name or URL').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('pause').setDescription('Pause the currently playing song')
    )
    .addSubcommand(sub =>
      sub.setName('resume').setDescription('Resume the paused song')
    )
    .addSubcommand(sub =>
      sub.setName('skip').setDescription('Skip the current song')
    )
    .addSubcommand(sub =>
      sub.setName('queue').setDescription('Show the song queue')
    )
    .addSubcommand(sub =>
      sub.setName('connect').setDescription('Connect bot to your voice channel')
    )
    .addSubcommand(sub =>
      sub.setName('disconnect').setDescription('Disconnect bot from voice channel and clear queue')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const voiceChannel = interaction.member.voice.channel;
    const guildId = interaction.guild.id;

    if (['play', 'pause', 'resume', 'skip', 'queue', 'disconnect'].includes(subcommand) && !voiceChannel) {
      return interaction.reply('You need to be in a voice channel for this command! 🎧');
    }

    switch (subcommand) {
      case 'play': {
        const query = interaction.options.getString('query');
        await playCommand(interaction, voiceChannel, query);
        break;
      }
      case 'pause': {
        await pauseCommand(interaction, guildId);
        break;
      }
      case 'resume': {
        await resumeCommand(interaction, guildId);
        break;
      }
      case 'skip': {
        await skipCommand(interaction, guildId);
        break;
      }
      case 'queue': {
        await queueCommand(interaction, guildId);
        break;
      }
      case 'connect': {
        await connectCommand(interaction, voiceChannel);
        break;
      }
      case 'disconnect': {
        await disconnectCommand(interaction, guildId);
        break;
      }
    }
  },
};

async function playCommand(interaction, voiceChannel, query) {
  const guildId = interaction.guild.id;
  const permissions = voiceChannel.permissionsFor(interaction.client.user);

  if (!permissions.has('Connect') || !permissions.has('Speak')) {
    return interaction.reply('I need permissions to join and speak in your voice channel! 🔊');
  }

  let serverQueue = queue.get(guildId);

  const songInfo = await getSongInfo(query);
  if (!songInfo) return interaction.reply('No results found for that song! 😕');

  const song = {
    title: songInfo.title,
    url: songInfo.video_url,
  };

  if (!serverQueue) {
    const queueConstruct = {
      textChannel: interaction.channel,
      voiceChannel: voiceChannel,
      connection: null,
      player: createAudioPlayer(),
      songs: [],
      playing: true,
    };

    queue.set(guildId, queueConstruct);

    queueConstruct.songs.push(song);

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
      queueConstruct.connection = connection;

      connection.subscribe(queueConstruct.player);

      setupPlayerListeners(queueConstruct, guildId);

      playSong(guildId, queueConstruct.songs[0]);

      await interaction.reply(`🎶 Now playing: **${song.title}**`);
    } catch (err) {
      console.error(err);
      queue.delete(guildId);
      return interaction.reply('Error connecting to the voice channel! ❌');
    }
  } else {
    serverQueue.songs.push(song);
    return interaction.reply(`✅ **${song.title}** added to the queue!`);
  }
}

async function pauseCommand(interaction, guildId) {
  const serverQueue = queue.get(guildId);
  if (!serverQueue) return interaction.reply('There is no music playing right now!');

  if (serverQueue.player.state.status !== AudioPlayerStatus.Playing)
    return interaction.reply('The music is not playing.');

  serverQueue.player.pause();
  interaction.reply('⏸️ Music paused!');
}

async function resumeCommand(interaction, guildId) {
  const serverQueue = queue.get(guildId);
  if (!serverQueue) return interaction.reply('There is no music paused right now!');

  if (serverQueue.player.state.status !== AudioPlayerStatus.Paused)
    return interaction.reply('The music is not paused.');

  serverQueue.player.unpause();
  interaction.reply('▶️ Music resumed!');
}

async function skipCommand(interaction, guildId) {
  const serverQueue = queue.get(guildId);
  if (!serverQueue) return interaction.reply('There is no music playing right now!');

  serverQueue.player.stop();
  interaction.reply('⏭️ Skipped current song!');
}

async function queueCommand(interaction, guildId) {
  const serverQueue = queue.get(guildId);
  if (!serverQueue || !serverQueue.songs.length)
    return interaction.reply('The queue is empty!');

  const q = serverQueue.songs
    .map((song, i) => `${i + 1}. ${song.title}`)
    .slice(0, 10)
    .join('\n');

  interaction.reply(`🎶 **Song Queue:**\n${q}${serverQueue.songs.length > 10 ? `\n...and ${serverQueue.songs.length - 10} more.` : ''}`);
}

async function connectCommand(interaction, voiceChannel) {
  const guildId = interaction.guild.id;
  const permissions = voiceChannel.permissionsFor(interaction.client.user);

  if (!permissions.has('Connect') || !permissions.has('Speak')) {
    return interaction.reply('I need permissions to join and speak in your voice channel! 🔊');
  }

  let serverQueue = queue.get(guildId);

  if (serverQueue && serverQueue.connection) {
    return interaction.reply('I am already connected to a voice channel!');
  }

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    if (!serverQueue) {
      queue.set(guildId, {
        textChannel: interaction.channel,
        voiceChannel: voiceChannel,
        connection: connection,
        player: createAudioPlayer(),
        songs: [],
        playing: false,
      });
    } else {
      serverQueue.connection = connection;
    }

    interaction.reply(`Connected to ${voiceChannel.name}! 🎧`);
  } catch (err) {
    console.error(err);
    interaction.reply('Failed to connect to the voice channel.');
  }
}

async function disconnectCommand(interaction, guildId) {
  const serverQueue = queue.get(guildId);
  if (!serverQueue) return interaction.reply('I am not connected to any voice channel.');

  try {
    serverQueue.player.stop();
    serverQueue.connection.destroy();
    queue.delete(guildId);
    interaction.reply('Disconnected and cleared the queue. Bye! 👋');
  } catch (err) {
    console.error(err);
    interaction.reply('Failed to disconnect properly.');
  }
}

// Helper funcs

async function getSongInfo(query) {
  if (ytdl.validateURL(query)) {
    const info = await ytdl.getInfo(query);
    return info.videoDetails;
  } else {
    const result = await ytSearch(query);
    if (result && result.videos.length > 0) return result.videos[0];
    else return null;
  }
}

function setupPlayerListeners(queueConstruct, guildId) {
  queueConstruct.player.on(AudioPlayerStatus.Idle, () => {
    queueConstruct.songs.shift();
    if (queueConstruct.songs.length > 0) {
      playSong(guildId, queueConstruct.songs[0]);
    } else {
      // Leave after queue ends
      queueConstruct.connection.destroy();
      queue.delete(guildId);
    }
  });

  queueConstruct.player.on('error', error => {
    console.error('Audio Player Error:', error);
    queueConstruct.songs.shift();
    if (queueConstruct.songs.length > 0) {
      playSong(guildId, queueConstruct.songs[0]);
    } else {
      queueConstruct.connection.destroy();
      queue.delete(guildId);
    }
  });
}

function playSong(guildId, song) {
  const serverQueue = queue.get(guildId);
  if (!song) return;

  const stream = ytdl(song.url, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
  });

  const resource = createAudioResource(stream);

  serverQueue.player.play(resource);
  serverQueue.playing = true;
}
