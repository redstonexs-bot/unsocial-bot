const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ─── Config ───────────────────────────────────────────────────────────────────
const PREFIX             = '!';
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const GOODBYE_CHANNEL_ID = process.env.GOODBYE_CHANNEL_ID;
const RULES_CHANNEL_ID   = process.env.RULES_CHANNEL_ID;
const TICKETS_CHANNEL_ID = process.env.TICKETS_CHANNEL_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const LOG_CHANNEL_ID     = process.env.LOG_CHANNEL_ID;

// All three staff roles
const MOD_ROLE_ID      = process.env.MOD_ROLE_ID;
const COOWNER_ROLE_ID  = process.env.COOWNER_ROLE_ID;
const OWNER_ROLE_ID    = process.env.OWNER_ROLE_ID;

// Helper: get all staff role IDs that are set
const STAFF_ROLE_IDS = [MOD_ROLE_ID, COOWNER_ROLE_ID, OWNER_ROLE_ID].filter(Boolean);

const RULES_IMAGE_URL = 'https://i.pinimg.com/originals/ee/87/e1/ee87e12dc91f23b572cd566efc7f3137.gif';
const SERVER_NAME     = '/unsocial';
const SERVER_DESC     = 'we are a **sfw** server based on **socialising**, offering **active & friendly chats** ♡';

const RULES = [
  { title: 'be respectful',      desc: 'treat everyone with kindness. no bullying, harassment, or hate speech.' },
  { title: 'no spam',            desc: 'keep messages meaningful. no repeated messages or excessive caps.' },
  { title: 'sfw only',           desc: 'this is a strictly sfw server. nsfw content will result in an instant ban.' },
  { title: 'no advertising',     desc: 'do not dm members or post unsolicited server invites.' },
  { title: 'follow discord tos', desc: 'discord.com/terms — violations will be reported and result in a ban.' },
  { title: 'listen to staff',    desc: 'moderator decisions are final. dm staff if you have concerns.' },
];

const TICKET_TYPES = {
  support:    { label: 'Support',       emoji: '🎀' },
  report:     { label: 'Report a User', emoji: '⚠️' },
  ban_appeal: { label: 'Ban Appeal',    emoji: '📋' },
};

// ─── Rules ────────────────────────────────────────────────────────────────────
async function buildRulesMessage(guild) {
  const imageEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setImage(RULES_IMAGE_URL);

  const introEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`welcome to ${SERVER_NAME} ✦`)
    .setDescription(
      `${SERVER_DESC}\n\n` +
      `> acknowledge our server rules before\n> interacting in ${SERVER_NAME} 🎀\n\n` +
      `follow **[discord terms](https://discord.com/terms)** & **[guidelines](https://discord.com/guidelines)**\n` +
      `↳ this server follows discord guidelines!`
    );

  const rulesText = RULES.map((r, i) =>
    `♡ **${i + 1}. ${r.title}**\n↳ ${r.desc}`
  ).join('\n\n');

  const rulesEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setDescription(rulesText)
    .setFooter({ text: 'done reading? check out #chat ♡' });

  return { embeds: [imageEmbed, introEmbed, rulesEmbed] };
}

async function postRules(guild) {
  const channel = guild.channels.cache.get(RULES_CHANNEL_ID);
  if (!channel) return console.warn('⚠️  RULES_CHANNEL_ID not found.');
  const fetched = await channel.messages.fetch({ limit: 20 });
  const old = fetched.filter(m => m.author.id === client.user.id);
  if (old.size) await channel.bulkDelete(old).catch(() => {});
  await channel.send(await buildRulesMessage(guild));
  console.log('✅ Rules posted.');
}

// ─── Ticket panel ─────────────────────────────────────────────────────────────
async function postTicketPanel(guild) {
  const channel = guild.channels.cache.get(TICKETS_CHANNEL_ID);
  if (!channel) return console.warn('⚠️  TICKETS_CHANNEL_ID not found.');
  const fetched = await channel.messages.fetch({ limit: 20 });
  const old = fetched.filter(m => m.author.id === client.user.id);
  if (old.size) await channel.bulkDelete(old).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`${SERVER_NAME} — support ✦`)
    .setDescription(
      `need help or want to report something?\nclick a button below to open a ticket ♡\n\n` +
      `🎀 **support** — general help or questions\n` +
      `⚠️ **report a user** — report a rule-breaking member\n` +
      `📋 **ban appeal** — appeal a ban or punishment`
    )
    .setFooter({ text: 'please only open tickets for genuine issues ♡' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setEmoji('🎀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_report').setLabel('Report a User').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_ban_appeal').setLabel('Ban Appeal').setEmoji('📋').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({ embeds: [embed], components: [row] });
  console.log('✅ Ticket panel posted.');
}

// ─── Create ticket ────────────────────────────────────────────────────────────
async function createTicket(interaction, type) {
  const guild  = interaction.guild;
  const member = interaction.member;
  const { label, emoji } = TICKET_TYPES[type];

  const existing = guild.channels.cache.find(
    c => c.name === `${type}-${member.user.username}` && c.topic?.includes(member.id)
  );
  if (existing) {
    return interaction.reply({ content: `❌ You already have an open ticket: <#${existing.id}>`, ephemeral: true });
  }

  // Everyone is denied, ticket opener gets access, all staff roles get access
  const permissionOverwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: member.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    // Add each staff role (mod, co-owner, owner)
    ...STAFF_ROLE_IDS.map(roleId => ({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    })),
  ];

  const ticketChannel = await guild.channels.create({
    name: `${type}-${member.user.username}`,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID || null,
    topic: `Ticket by ${member.user.tag} (${member.id}) | Type: ${label}`,
    permissionOverwrites,
  });

  // Ping all staff roles
  const staffPings = STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ');

  const ticketEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`${emoji} ${label} ticket`)
    .setDescription(
      `hey ${member}, thanks for reaching out ♡\n\n` +
      `please describe your issue and staff will be with you shortly.\n\n` +
      `> **ticket type:** ${label}\n> **opened by:** ${member.user.tag}`
    )
    .setFooter({ text: `${SERVER_NAME} support` })
    .setTimestamp();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );

  await ticketChannel.send({
    content: `${member} ${staffPings}`,
    embeds: [ticketEmbed],
    components: [closeRow],
  });

  await interaction.reply({ content: `✅ Ticket opened: <#${ticketChannel.id}>`, ephemeral: true });
}

// ─── Close ticket ─────────────────────────────────────────────────────────────
async function closeTicket(interaction) {
  const channel = interaction.channel;
  const isMod   = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);
  const isOwner = channel.topic?.includes(interaction.user.id);

  if (!isMod && !isOwner) {
    return interaction.reply({ content: '❌ Only staff or the ticket owner can close this.', ephemeral: true });
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`🔒 ticket closed by **${interaction.user.tag}** — deleting in 5 seconds.`)
        .setTimestamp(),
    ],
  });

  if (LOG_CHANNEL_ID) {
    const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🔒 Ticket Closed')
            .addFields(
              { name: 'Channel',   value: channel.name,         inline: true },
              { name: 'Closed by', value: interaction.user.tag, inline: true },
              { name: 'Topic',     value: channel.topic || 'N/A' },
            )
            .setTimestamp(),
        ],
      });
    }
  }

  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity(`${SERVER_NAME} | !help`);
  for (const guild of client.guilds.cache.values()) {
    await postRules(guild).catch(console.error);
    await postTicketPanel(guild).catch(console.error);
  }
});

// ─── Button interactions ──────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const { customId } = interaction;
  if (customId === 'ticket_support')    return createTicket(interaction, 'support');
  if (customId === 'ticket_report')     return createTicket(interaction, 'report');
  if (customId === 'ticket_ban_appeal') return createTicket(interaction, 'ban_appeal');
  if (customId === 'ticket_close')      return closeTicket(interaction);
});

// ─── Welcome / Goodbye ────────────────────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;
  const introChannel = member.guild.channels.cache.find(c => c.name === 'intro');
  channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`welcome to ${SERVER_NAME} ✦`)
        .setDescription(
          `hey ${member}, glad you're here! ♡\n\n` +
          `↳ read the rules in <#${RULES_CHANNEL_ID}>\n` +
          (introChannel ? `↳ introduce yourself in <#${introChannel.id}>` : '')
        )
        .setImage(RULES_IMAGE_URL)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `member #${member.guild.memberCount}` })
        .setTimestamp(),
    ],
  });
});

client.on('guildMemberRemove', async (member) => {
  const channel = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
  if (!channel) return;
  channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(`**${member.user.tag}** has left ${SERVER_NAME}. we'll miss them ♡`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp(),
    ],
  });
});

// ─── Commands ─────────────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  const args    = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`${SERVER_NAME} — commands ✦`)
          .addFields(
            { name: '📋 general', value: '`!rules` — post rules\n`!ticket` — open a ticket\n`!help` — this message' },
            { name: '🔨 moderation (staff only)', value: '`!kick @user [reason]`\n`!ban @user [reason]`\n`!unban <id>`\n`!mute @user <minutes> [reason]`\n`!unmute @user`\n`!purge <1–100>`\n`!setup` — refresh rules & ticket panel' },
          )
          .setFooter({ text: `${SERVER_NAME} ♡` }),
      ],
    });
  }

  if (command === 'rules') {
    return message.channel.send(await buildRulesMessage(message.guild));
  }

  if (command === 'ticket') {
    const map  = { support: 'support', report: 'report', appeal: 'ban_appeal', ban_appeal: 'ban_appeal' };
    const type = map[args[0]?.toLowerCase()];
    if (!type) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setEmoji('🎀').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_report').setLabel('Report a User').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_ban_appeal').setLabel('Ban Appeal').setEmoji('📋').setStyle(ButtonStyle.Secondary),
      );
      return message.reply({ content: 'what kind of ticket do you need? ♡', components: [row] });
    }
    return createTicket({ guild: message.guild, member: message.member, user: message.author, reply: o => message.reply(o) }, type);
  }

  const isMod = message.member.permissions.has(PermissionFlagsBits.ModerateMembers);
  if (!isMod) return;

  if (command === 'setup') {
    await postRules(message.guild);
    await postTicketPanel(message.guild);
    return message.reply('✅ Rules & ticket panel updated!').then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
  }

  if (command === 'kick') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    if (!target.kickable) return message.reply('❌ I cannot kick this user.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.kick(reason);
    const embed = modEmbed('🥾 member kicked', target.user, message.author, reason);
    message.channel.send({ embeds: [embed] });
    return logAction(message.guild, embed);
  }

  if (command === 'ban') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    if (!target.bannable) return message.reply('❌ I cannot ban this user.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.ban({ reason });
    const embed = modEmbed('🔨 member banned', target.user, message.author, reason);
    message.channel.send({ embeds: [embed] });
    return logAction(message.guild, embed);
  }

  if (command === 'unban') {
    if (!args[0]) return message.reply('❌ Please provide a user ID.');
    try {
      const unbanned = await message.guild.members.unban(args[0]);
      message.reply(`✅ Unbanned **${unbanned.tag}**.`);
    } catch { message.reply('❌ Could not find a ban for that user ID.'); }
    return;
  }

  if (command === 'mute') {
    const target  = message.mentions.members.first();
    const minutes = parseInt(args[1]);
    if (!target) return message.reply('❌ Please mention a user.');
    if (isNaN(minutes) || minutes < 1) return message.reply('❌ Provide valid minutes.');
    const reason = args.slice(2).join(' ') || 'No reason provided';
    await target.timeout(minutes * 60 * 1000, reason);
    const embed = modEmbed(`🔇 member muted (${minutes}m)`, target.user, message.author, reason);
    message.channel.send({ embeds: [embed] });
    return logAction(message.guild, embed);
  }

  if (command === 'unmute') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    await target.timeout(null);
    return message.reply(`✅ Unmuted **${target.user.tag}**.`);
  }

  if (command === 'purge') {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ Provide a number 1–100.');
    await message.channel.bulkDelete(amount + 1, true);
    const msg = await message.channel.send(`✅ Deleted **${amount}** messages.`);
    setTimeout(() => msg.delete().catch(() => {}), 3000);
    return;
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function modEmbed(title, targetUser, moderator, reason) {
  return new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(title)
    .addFields(
      { name: 'user',      value: `${targetUser.tag} (${targetUser.id})`, inline: true },
      { name: 'moderator', value: moderator.tag, inline: true },
      { name: 'reason',    value: reason },
    )
    .setTimestamp();
}

async function logAction(guild, embed) {
  if (!LOG_CHANNEL_ID) return;
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) logChannel.send({ embeds: [embed] });
}

client.login(process.env.DISCORD_TOKEN);
