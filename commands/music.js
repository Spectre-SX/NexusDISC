process.env.YTDL_NO_UPDATE = 'true'; // stop that annoying ytdl update check

import { 
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';

import { 
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
} from '@discordjs/voice';

import ytdlDiscord from 'ytdl-core-discord';

// Store guild audio state here
const guildAudio = new Map();

export const data = new SlashCommandBuilder()
  .setName('music')
  .setDescription('Music player commands')
  .addSubcommand(sub =>
    sub.setName('play')
      .setDescription('Play a YouTube URL')
      .addStringOption(opt => opt.setName('query').setDescription('YouTube URL').setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('pause')
      .setDescription('Pause the music'))
  .addSubcommand(sub =>
    sub.setName('resume')
      .setDescription('Resume the music'))
  .addSubcommand(sub =>
    sub.setName('skip')
      .setDescription('Skip the current song'))
  .addSubcommand(sub =>
    sub.setName('stop')
      .setDescription('Stop the music and clear the queue'))
  .addSubcommand(sub =>
    sub.setName('connect')
      .setDescription('Connect the bot to your voice channel'))
  .addSubcommand(sub =>
    sub.setName('disconnect')
      .setDescription('Disconnect the bot from voice channel'));

async function connectToVoice(interaction) {
  const { guild, member } = interaction;
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) return null;

  // Join voice and wait for ready state
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    return connection;
  } catch {
    connection.destroy();
    return null;
  }
}

async function playSong(interaction, url) {
  const { guild, member } = interaction;
  if (!member.voice.channel) {
    return interaction.reply({ content: 'Join a voice channel first!', ephemeral: true });
  }

  // Connect or get existing connection
  let audio = guildAudio.get(guild.id);
  if (!audio) {
    const connection = await connectToVoice(interaction);
    if (!connection) return interaction.reply({ content: 'Could not join voice channel.', ephemeral: true });

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    connection.subscribe(player);
    audio = {
      connection,
      player,
      queue: [],
      playing: false,
      resource: null,
    };
    guildAudio.set(guild.id, audio);

    player.on('error', error => {
      console.error('Player error:', error);
    });

    player.on(AudioPlayerStatus.Idle, () => {
      // Song finished, play next in queue or stop
      audio.queue.shift();
      if (audio.queue.length > 0) {
        playFromQueue(audio);
      } else {
        audio.playing = false;
        // Optionally disconnect after some time here
      }
    });
  }

  audio.queue.push(url);

  if (!audio.playing) {
    await interaction.deferReply();
    try {
      await playFromQueue(audio);
      await interaction.editReply(`🎶 Playing: ${url}`);
    } catch (e) {
      console.error(e);
      audio.queue.shift();
      await interaction.editReply('❌ Error playing the song.');
    }
  } else {
    await interaction.reply(`Added to queue: ${url}`);
  }
}

async function playFromQueue(audio) {
  const url = audio.queue[0];
  if (!url) return;

  const stream = await ytdlDiscord(url, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
    dlChunkSize: 0,
  });

  const resource = createAudioResource(stream, { inputType: stream.type });
  audio.player.play(resource);
  audio.resource = resource;
  audio.playing = true;
}

export async function execute(interaction) {
  const { guild, member, options } = interaction;
  if (!guild) return interaction.reply({ content: 'Use in a server please!', ephemeral: true });

  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case 'play':
      const query = options.getString('query');
      await playSong(interaction, query);
      break;

    case 'pause': {
      const audio = guildAudio.get(guild.id);
      if (!audio || !audio.playing) return interaction.reply({ content: 'Nothing is playing', ephemeral: true });
      audio.player.pause();
      interaction.reply('⏸️ Paused!');
      break;
    }

    case 'resume': {
      const audio = guildAudio.get(guild.id);
      if (!audio || !audio.playing) return interaction.reply({ content: 'Nothing is playing', ephemeral: true });
      audio.player.unpause();
      interaction.reply('▶️ Resumed!');
      break;
    }

    case 'skip': {
      const audio = guildAudio.get(guild.id);
      if (!audio || !audio.playing) return interaction.reply({ content: 'Nothing to skip', ephemeral: true });
      audio.player.stop();
      interaction.reply('⏭️ Skipped!');
      break;
    }

    case 'stop': {
      const audio = guildAudio.get(guild.id);
      if (!audio) return interaction.reply({ content: 'Nothing is playing', ephemeral: true });
      audio.queue = [];
      audio.player.stop();
      audio.playing = false;
      interaction.reply('⏹️ Stopped and cleared queue!');
      break;
    }

    case 'connect': {
      const connection = getVoiceConnection(guild.id);
      if (connection) return interaction.reply({ content: 'Already connected!', ephemeral: true });

      const newConnection = await connectToVoice(interaction);
      if (!newConnection) return interaction.reply({ content: 'Failed to connect to voice.', ephemeral: true });

      interaction.reply('✅ Connected to voice channel!');
      break;
    }

    case 'disconnect': {
      const audio = guildAudio.get(guild.id);
      if (!audio) return interaction.reply({ content: 'Not connected to voice!', ephemeral: true });

      audio.player.stop();
      audio.connection.destroy();
      guildAudio.delete(guild.id);
      interaction.reply('👋 Disconnected from voice channel!');
      break;
    }

    default:
      interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
  }
}
