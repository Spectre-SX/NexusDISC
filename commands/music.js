import { SlashCommandBuilder } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  AudioPlayerStatus,
  StreamType,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';

const audioPlayer = createAudioPlayer();

let connection = null;

export const data = new SlashCommandBuilder()
  .setName('music')
  .setDescription('Music commands: connect, disconnect, play')
  .addSubcommand(subcommand =>
    subcommand.setName('connect').setDescription('Join your voice channel'))
  .addSubcommand(subcommand =>
    subcommand.setName('disconnect').setDescription('Leave the voice channel'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('play')
      .setDescription('Play a YouTube song')
      .addStringOption(option =>
        option.setName('url').setDescription('YouTube URL').setRequired(true))
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'connect') {
    const memberVoiceChannel = interaction.member.voice.channel;
    if (!memberVoiceChannel)
      return interaction.reply('You need to be in a voice channel to use this!');

    connection = joinVoiceChannel({
      channelId: memberVoiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    // Optional: handle connection ready event
    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log('Connected to voice channel!');
    });

    interaction.reply(`Joined your voice channel: ${memberVoiceChannel.name}`);
  }

  else if (subcommand === 'disconnect') {
    connection = getVoiceConnection(interaction.guild.id);
    if (!connection)
      return interaction.reply('I am not connected to a voice channel!');

    connection.destroy();
    connection = null;
    interaction.reply('Disconnected from the voice channel.');
  }

  else if (subcommand === 'play') {
    const url = interaction.options.getString('url');

    // Validate URL (basic check)
    if (!ytdl.validateURL(url))
      return interaction.reply('Please provide a valid YouTube URL!');

    connection = getVoiceConnection(interaction.guild.id);
    if (!connection)
      return interaction.reply('I need to be connected to a voice channel first! Use /music connect.');

    try {
      // Stream with high buffer size to avoid errors
      const stream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
      });

      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
      });

      audioPlayer.play(resource);
      connection.subscribe(audioPlayer);

      audioPlayer.once(AudioPlayerStatus.Playing, () => {
        interaction.followUp(`🎶 Now playing: ${url}`);
      });

      audioPlayer.once('error', error => {
        console.error(error);
        interaction.followUp('❌ Error playing the song.');
      });

    } catch (error) {
      console.error(error);
      interaction.reply('❌ There was an error trying to play the song.');
    }
  }
}
