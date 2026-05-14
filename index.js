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
  AttachmentBuilder,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
require('dotenv').config();

// ─── Client ───────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ─── Config ───────────────────────────────────────────────────────────────────
const PREFIX = ',';

const WELCOME_CHANNEL_ID     = process.env.WELCOME_CHANNEL_ID;
const GOODBYE_CHANNEL_ID     = process.env.GOODBYE_CHANNEL_ID;
const RULES_CHANNEL_ID       = process.env.RULES_CHANNEL_ID;
const TICKETS_CHANNEL_ID     = process.env.TICKETS_CHANNEL_ID;
const TICKET_CATEGORY_ID     = process.env.TICKET_CATEGORY_ID;
const MOD_ROLE_ID            = process.env.MOD_ROLE_ID;
const COOWNER_ROLE_ID        = process.env.COOWNER_ROLE_ID;
const OWNER_ROLE_ID          = process.env.OWNER_ROLE_ID;

const SUGGESTIONS_CHANNEL_ID = '1503081779571986614';
const ALERT_CHANNEL_ID       = '1486680372560527503';
const LOG_CHANNEL_ID         = '1503042913867792476';
const ANNOUNCE_CHANNEL_ID    = '1486682318822178906';
const BUMP_CHANNEL_ID        = '1486680372560527503';
const BOOSTER_ROLE_ID        = '1503318419880149053';
const BOOST_ANNOUNCE_ID      = '1497409941445546105';
const VERIFY_CHANNEL_ID      = '1503141954051903518';
const VERIFIED_ROLE_ID       = '1503141590330380288';
const UNVERIFIED_ROLE_ID     = '1503141548295192698';
const CONFESSION_CHANNEL_ID  = '1489957438978396180';
const OWNER_USER_ID          = '1323308066523058239';

// Custom ping replies
const PING_REPLIES = {
  '1323308066523058239': 'You can do it yourself.',
  '1344390615575560356': 'miku miku beam ✨',
  '1430173077756448778': 'bulb 💡',
  '1427983102583509002': 'go touch grass bestie 🌱',
  '1316401543636848642': 'send a GTR first, then maybe she\'ll reply!',
};

const STAFF_ROLE_IDS  = [MOD_ROLE_ID, COOWNER_ROLE_ID, OWNER_ROLE_ID].filter(Boolean);
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

// ─── Data ─────────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function loadData(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) fs.writeFileSync(p, '{}');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}
function loadList(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) fs.writeFileSync(p, '[]');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}
function saveData(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}
function saveList(file, list) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(list, null, 2));
}

let xpData         = loadData('xp.json');
let warningData    = loadData('warnings.json');
let reminderData   = loadData('reminders.json');
let starsData      = loadData('stars.json');
let botWhitelist   = loadList('botwhitelist.json');
let trustedUsers   = loadList('trusted.json');
let notesData      = loadData('notes.json');
let confessionCount = loadData('confessions.json');

// ─── XP ───────────────────────────────────────────────────────────────────────
const xpCooldowns = new Map();
const XP_COOLDOWN = 60000;
let xpDirty = false, starsDirty = false, warningsDirty = false;

// Batch save every 30 seconds
setInterval(() => {
  if (xpDirty)       { saveData('xp.json', xpData);           xpDirty = false; }
  if (starsDirty)    { saveData('stars.json', starsData);     starsDirty = false; }
  if (warningsDirty) { saveData('warnings.json', warningData); warningsDirty = false; }
}, 30000);

function getXP(guildId, userId) {
  if (!xpData[guildId]) xpData[guildId] = {};
  if (!xpData[guildId][userId]) xpData[guildId][userId] = { xp: 0, level: 0, totalXp: 0 };
  return xpData[guildId][userId];
}
function xpForLevel(level) { return Math.floor(100 * Math.pow(1.15, level)); }
function addXP(guildId, userId, amount = 15) {
  const data   = getXP(guildId, userId);
  data.xp     += amount;
  data.totalXp = (data.totalXp || 0) + amount;
  let leveledUp = false;
  while (data.xp >= xpForLevel(data.level + 1)) {
    data.xp -= xpForLevel(data.level + 1);
    data.level++;
    leveledUp = true;
  }
  xpData[guildId][userId] = data;
  xpDirty = true;
  return { ...data, leveledUp };
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function getStars(guildId, userId) {
  if (!starsData[guildId]) starsData[guildId] = {};
  return starsData[guildId][userId] || 0;
}
function addStars(guildId, userId, amount) {
  if (!starsData[guildId]) starsData[guildId] = {};
  starsData[guildId][userId] = Math.max(0, (starsData[guildId][userId] || 0) + amount);
  starsDirty = true;
  return starsData[guildId][userId];
}

// ─── Warnings ─────────────────────────────────────────────────────────────────
function getWarnings(guildId, userId) {
  if (!warningData[guildId]) warningData[guildId] = {};
  return warningData[guildId][userId] || [];
}
function addWarning(guildId, userId, reason, moderator) {
  if (!warningData[guildId]) warningData[guildId] = {};
  if (!warningData[guildId][userId]) warningData[guildId][userId] = [];
  warningData[guildId][userId].push({ reason, moderator, date: new Date().toISOString() });
  warningsDirty = true;
  return warningData[guildId][userId].length;
}
function clearWarnings(guildId, userId) {
  if (warningData[guildId]) warningData[guildId][userId] = [];
  saveData('warnings.json', warningData);
}

// ─── Notes ────────────────────────────────────────────────────────────────────
function addNote(guildId, userId, note, staffTag) {
  if (!notesData[guildId]) notesData[guildId] = {};
  if (!notesData[guildId][userId]) notesData[guildId][userId] = [];
  notesData[guildId][userId].push({ note, staffTag, date: new Date().toISOString() });
  saveData('notes.json', notesData);
}
function getNotes(guildId, userId) {
  if (!notesData[guildId]) return [];
  return notesData[guildId][userId] || [];
}

// ─── Reminders ────────────────────────────────────────────────────────────────
function parseTime(str) {
  const m = str.match(/^(\d+)(s|m|h|d)$/);
  if (!m) return null;
  return parseInt(m[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
}
setInterval(async () => {
  const now = Date.now(); let changed = false;
  for (const uid in reminderData) {
    const before = reminderData[uid].length;
    reminderData[uid] = reminderData[uid].filter(r => {
      if (now >= r.time) {
        client.users.fetch(uid).then(u => u.send({
          embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle('⏰ reminder!').setDescription(r.message).setFooter({ text: `${SERVER_NAME} ♡` }).setTimestamp()],
        })).catch(() => {});
        return false;
      }
      return true;
    });
    if (reminderData[uid].length !== before) changed = true;
  }
  if (changed) saveData('reminders.json', reminderData);
}, 30000);

// ─── Anti-spam ────────────────────────────────────────────────────────────────
const spamMap = new Map();
async function checkSpam(message) {
  const uid = message.author.id;
  if (!spamMap.has(uid)) {
    spamMap.set(uid, { count: 1, timer: setTimeout(() => spamMap.delete(uid), 5000) });
    return false;
  }
  const d = spamMap.get(uid);
  d.count++;
  if (d.count >= 8) {
    clearTimeout(d.timer); spamMap.delete(uid);
    await message.member.timeout(5 * 60 * 1000, 'Auto-mod: spam').catch(() => {});
    message.channel.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`🔇 ${message.author} muted for **5 minutes** for spamming.`).setTimestamp()] });
    logEmbed(message.guild, new EmbedBuilder().setColor(0xED4245).setTitle('🔇 Auto-Mod: Spam')
      .addFields({ name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true }, { name: 'Channel', value: `<#${message.channel.id}>`, inline: true }).setTimestamp());
    return true;
  }
  return false;
}

// ─── Anti-raid ────────────────────────────────────────────────────────────────
const recentJoins    = [];
const RAID_THRESHOLD = 3;
const RAID_INTERVAL  = 5000;

async function checkRaid(member) {
  const guild = member.guild;

  // Allow whitelisted bots
  if (member.user.bot) {
    if (botWhitelist.includes(member.user.id)) return;
    await guild.members.ban(member.id, { reason: 'Auto-mod: unauthorized bot' }).catch(() => {});
    const alertCh = guild.channels.cache.get(ALERT_CHANNEL_ID);
    if (alertCh) alertCh.send({
      embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🤖 Unauthorized Bot Banned')
        .setDescription(`**${member.user.tag}** (${member.id}) tried to join as a bot and was instantly banned.\n\nif this was a mistake, use \`,addbot ${member.id}\` next time before inviting.`)
        .setTimestamp()],
    });
    return;
  }

  // Flag accounts under 7 days (skip if trusted)
  const ageDays = (Date.now() - member.user.createdTimestamp) / 86400000;

  if (trustedUsers.includes(member.user.id)) {
    console.log(`✅ Trusted user ${member.user.tag} joined — skipping age checks.`);
  } else {
    // Ban accounts under 1 day old
    if (ageDays < 1) {
      await guild.members.ban(member.id, { reason: 'Auto-mod: account too new' }).catch(() => {});
      const alertCh = guild.channels.cache.get(ALERT_CHANNEL_ID);
      if (alertCh) alertCh.send({
        embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🚫 Brand New Account Banned')
          .setDescription(`**${member.user.tag}** was banned — account was only **${Math.floor(ageDays * 24)} hours** old.`).setTimestamp()],
      });
      return;
    }
    // Flag accounts under 7 days
    if (ageDays < 7) {
      const alertCh = guild.channels.cache.get(ALERT_CHANNEL_ID);
      if (alertCh) alertCh.send({
        embeds: [new EmbedBuilder().setColor(0xFEE75C).setTitle('⚠️ Potential Alt Account')
          .setDescription(`**${member.user.tag}** joined with an account only **${Math.floor(ageDays)} days** old.\n> <@${member.id}>\n> created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`).setTimestamp()],
      });
    }
  }

  // Mass join detection
  const now = Date.now();
  recentJoins.push({ id: member.id, tag: member.user.tag, time: now });
  const window = recentJoins.filter(j => now - j.time < RAID_INTERVAL);
  recentJoins.length = 0;
  recentJoins.push(...window);
  if (window.length < RAID_THRESHOLD) return;

  const raiders = [...window];
  guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch =>
    ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {})
  );

  const alertCh = guild.channels.cache.get(ALERT_CHANNEL_ID);
  if (alertCh) alertCh.send({
    embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🚨 RAID DETECTED & NEUTRALIZED')
      .setDescription(
        `an attempted raid by **${raiders.length}** accounts has been stopped.\n\n` +
        `the following tried to raid **${SERVER_NAME}** and got instantly banned:\n\n` +
        `${raiders.map(r => `• **${r.tag}** (<@${r.id}>)`).join('\n')}\n\n` +
        `better luck next time 💀\n\n*use \`,unlockdown\` to restore the server.*`
      ).setTimestamp()],
  });

  for (const r of raiders) await guild.members.ban(r.id, { reason: 'Auto-mod: raid' }).catch(() => {});
  client.users.fetch(OWNER_USER_ID).then(u => u.send({
    embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🚨 Raid Alert')
      .setDescription(`A raid was detected on **${guild.name}**. ${raiders.length} accounts were banned. Use \`,unlockdown\` to restore.`).setTimestamp()],
  })).catch(() => {});
  recentJoins.length = 0;
}

// ─── Auto-mod ─────────────────────────────────────────────────────────────────
function containsBlacklisted(text) {
  const clean = text.toLowerCase().replace(/[\s\-_.]+/g, '');
  return /n+[i!1|l]+[g9qc]+[g9qc]+[e3a@o0]+[rz]*/i.test(clean);
}

async function logEmbed(guild, embed) {
  const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (ch) ch.send({ embeds: [embed] });
}

// ─── Verify panel ─────────────────────────────────────────────────────────────
async function postVerifyPanel(guild) {
  const ch = guild.channels.cache.get(VERIFY_CHANNEL_ID);
  if (!ch) return console.warn('⚠️  VERIFY_CHANNEL_ID not found.');
  const old = (await ch.messages.fetch({ limit: 20 })).filter(m => m.author.id === client.user.id);
  if (old.size) await ch.bulkDelete(old).catch(() => {});

  await ch.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x000000)
        .setTitle('verify to get access')
        .setDescription(
          `welcome to **${SERVER_NAME}** ♡\n\n` +
          `click the button below to verify and gain access to the server.\n\n` +
          `↳ by verifying you agree to follow our rules.`
        )
        .setImage('https://i.pinimg.com/originals/ee/87/e1/ee87e12dc91f23b572cd566efc7f3137.gif')
        .setFooter({ text: `${SERVER_NAME} verification` }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_member')
          .setLabel('Verify')
          .setEmoji('🔓')
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
  console.log('✅ Verify panel posted.');
}

// ─── Rules ────────────────────────────────────────────────────────────────────
async function buildRulesMessage() {
  return {
    embeds: [
      new EmbedBuilder().setColor(0x2b2d31).setImage(RULES_IMAGE_URL),
      new EmbedBuilder().setColor(0x2b2d31).setTitle(`welcome to ${SERVER_NAME} ✦`)
        .setDescription(`${SERVER_DESC}\n\n> acknowledge our server rules before\n> interacting in ${SERVER_NAME} 🎀\n\nfollow **[discord terms](https://discord.com/terms)** & **[guidelines](https://discord.com/guidelines)**\n↳ this server follows discord guidelines!`),
      new EmbedBuilder().setColor(0x2b2d31)
        .setDescription(RULES.map((r, i) => `♡ **${i + 1}. ${r.title}**\n↳ ${r.desc}`).join('\n\n'))
        .setFooter({ text: 'done reading? check out #chat ♡' }),
    ],
  };
}

async function postRules(guild) {
  const ch = guild.channels.cache.get(RULES_CHANNEL_ID);
  if (!ch) return console.warn('⚠️  RULES_CHANNEL_ID not found.');
  const old = (await ch.messages.fetch({ limit: 20 })).filter(m => m.author.id === client.user.id);
  if (old.size) await ch.bulkDelete(old).catch(() => {});
  await ch.send(await buildRulesMessage());
  console.log('✅ Rules posted.');
}

// ─── Ticket panel ─────────────────────────────────────────────────────────────
async function postTicketPanel(guild) {
  const ch = guild.channels.cache.get(TICKETS_CHANNEL_ID);
  if (!ch) return console.warn('⚠️  TICKETS_CHANNEL_ID not found.');
  const old = (await ch.messages.fetch({ limit: 20 })).filter(m => m.author.id === client.user.id);
  if (old.size) await ch.bulkDelete(old).catch(() => {});
  await ch.send({
    embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${SERVER_NAME} — support ✦`)
      .setDescription(`need help or want to report something?\nclick a button below to open a ticket ♡\n\n🎀 **support** — general help or questions\n⚠️ **report a user** — report a rule-breaking member\n📋 **ban appeal** — appeal a ban or punishment`)
      .setFooter({ text: 'please only open tickets for genuine issues ♡' })],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setEmoji('🎀').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_report').setLabel('Report a User').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_ban_appeal').setLabel('Ban Appeal').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    )],
  });
  console.log('✅ Ticket panel posted.');
}

// ─── Tickets ──────────────────────────────────────────────────────────────────
async function createTicket(interaction, type) {
  const guild = interaction.guild, member = interaction.member;
  const { label, emoji } = TICKET_TYPES[type];
  const existing = guild.channels.cache.find(c => c.name === `${type}-${member.user.username}` && c.topic?.includes(member.id));
  if (existing) return interaction.reply({ content: `❌ You already have an open ticket: <#${existing.id}>`, ephemeral: true });

  const ticketChannel = await guild.channels.create({
    name: `${type}-${member.user.username}`,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID || null,
    topic: `Ticket by ${member.user.tag} (${member.id}) | Type: ${label}`,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...STAFF_ROLE_IDS.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] })),
    ],
  });

  await ticketChannel.send({
    content: `${member} ${STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ')}`,
    embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${emoji} ${label} ticket`)
      .setDescription(`hey ${member}, thanks for reaching out ♡\n\nplease describe your issue and staff will be with you shortly.\n\n> **ticket type:** ${label}\n> **opened by:** ${member.user.tag}`)
      .setFooter({ text: `${SERVER_NAME} support` }).setTimestamp()],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    )],
  });
  await interaction.reply({ content: `✅ Ticket opened: <#${ticketChannel.id}>`, ephemeral: true });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;
  const isMod   = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);
  const isOwner = channel.topic?.includes(interaction.user.id);
  if (!isMod && !isOwner) return interaction.reply({ content: '❌ Only staff or the ticket owner can close this.', ephemeral: true });

  await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('🔒 closing ticket — saving transcript and deleting in 10 seconds.').setTimestamp()] });

  const messages   = await channel.messages.fetch({ limit: 100 });
  const transcript = [...messages.values()].reverse()
    .map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`).join('\n');
  const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: `transcript-${channel.name}.txt` });

  const logCh = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logCh) logCh.send({
    embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🔒 Ticket Closed')
      .addFields({ name: 'Channel', value: channel.name, inline: true }, { name: 'Closed by', value: interaction.user.tag, inline: true }, { name: 'Topic', value: channel.topic || 'N/A' }).setTimestamp()],
    files: [attachment],
  });
  setTimeout(() => channel.delete().catch(() => {}), 10000);
}

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity(`${SERVER_NAME} | ,help`);
  for (const guild of client.guilds.cache.values()) {
    await postRules(guild).catch(console.error);
    await postTicketPanel(guild).catch(console.error);
    await postVerifyPanel(guild).catch(console.error);
  }
});

// Bump reminder every 2 hours
setInterval(() => {
  for (const guild of client.guilds.cache.values()) {
    const ch = guild.channels.cache.get(BUMP_CHANNEL_ID);
    if (!ch) return;
    ch.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⏰ time to bump the server! use \`/bump\` ♡\n${STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ')}`).setTimestamp()] });
  }
}, 2 * 60 * 60 * 1000);

// ─── Buttons ──────────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const { customId } = interaction;

  // Verify button
  if (customId === 'verify_member') {
    const member = interaction.member;
    try {
      await interaction.deferReply({ ephemeral: true });

      const verifiedRole   = interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);
      const unverifiedRole = interaction.guild.roles.cache.get(UNVERIFIED_ROLE_ID);

      if (!verifiedRole)   return interaction.editReply({ content: '❌ Verified role not found. Please contact staff.' });
      if (!unverifiedRole) return interaction.editReply({ content: '❌ Unverified role not found. Please contact staff.' });

      if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
        return interaction.editReply({ content: '✅ You are already verified!' });
      }

      await member.roles.add(verifiedRole);
      await member.roles.remove(unverifiedRole).catch(() => {});

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ you've been verified! welcome to **${SERVER_NAME}** ♡`)],
      });
    } catch (err) {
      console.error('Verify error:', err);
      return interaction.editReply({ content: `❌ Failed to verify: ${err.message}. Please contact staff.` });
    }
  }

  if (customId === 'ticket_support')    return createTicket(interaction, 'support');
  if (customId === 'ticket_report')     return createTicket(interaction, 'report');
  if (customId === 'ticket_ban_appeal') return createTicket(interaction, 'ban_appeal');
  if (customId === 'ticket_close')      return closeTicket(interaction);
});

// ─── Member join ──────────────────────────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  await checkRaid(member);
  if (member.user.bot) return;

  // Give unverified role
  await member.roles.add(UNVERIFIED_ROLE_ID).catch(() => {});

  const welcomeCh = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  const introCh   = member.guild.channels.cache.find(c => c.name === 'intro');
  if (welcomeCh) welcomeCh.send({
    embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`welcome to ${SERVER_NAME} ✦`)
      .setDescription(`hey ${member}, glad you're here! ♡\n\n↳ verify in <#${VERIFY_CHANNEL_ID}> to get access\n↳ read the rules in <#${RULES_CHANNEL_ID}>\n${introCh ? `↳ introduce yourself in <#${introCh.id}>` : ''}`)
      .setImage(RULES_IMAGE_URL).setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `member #${member.guild.memberCount}` }).setTimestamp()],
  });
});

// ─── Member leave ─────────────────────────────────────────────────────────────
client.on('guildMemberRemove', async (member) => {
  const ch = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
  if (!ch) return;
  ch.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`**${member.user.tag}** has left ${SERVER_NAME}. we'll miss them ♡`).setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setTimestamp()] });
});

// ─── Booster role ─────────────────────────────────────────────────────────────
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (!oldMember.premiumSince && newMember.premiumSince) {
    await newMember.roles.add(BOOSTER_ROLE_ID).catch(() => {});
    const ch = newMember.guild.channels.cache.get(BOOST_ANNOUNCE_ID);
    if (ch) ch.send({ embeds: [new EmbedBuilder().setColor(0xFF73FA).setTitle('💜 new booster!').setDescription(`thank you **${newMember.user.tag}** for boosting **${SERVER_NAME}**! ♡\nyou've been given the booster role 🎀`).setThumbnail(newMember.user.displayAvatarURL({ dynamic: true })).setFooter({ text: `${SERVER_NAME} ♡` }).setTimestamp()] });
  }
  if (oldMember.premiumSince && !newMember.premiumSince) {
    await newMember.roles.remove(BOOSTER_ROLE_ID).catch(() => {});
  }
});

// ─── Deleted message log ──────────────────────────────────────────────────────
client.on('messageDelete', async (message) => {
  if (!message.guild) return;
  if (!message.content && !message.attachments.size) return;
  const logCh = message.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!logCh) return;

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🗑️ Message Deleted')
    .addFields(
      { name: 'Author',  value: message.author ? `${message.author.tag} (<@${message.author.id}>)` : 'Unknown', inline: true },
      { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
      { name: 'Content', value: message.content || '*no text content*' },
    )
    .setTimestamp();

  if (message.attachments.size) {
    embed.addFields({ name: 'Attachments', value: message.attachments.map(a => a.url).join('\n') });
  }

  logCh.send({ embeds: [embed] });
});

// ─── Bulk deleted message log ─────────────────────────────────────────────────
client.on('messageDeleteBulk', async (messages) => {
  const first = messages.first();
  if (!first?.guild) return;
  const logCh = first.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!logCh) return;
  logCh.send({
    embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🗑️ Bulk Delete')
      .addFields(
        { name: 'Channel', value: `<#${first.channel.id}>`, inline: true },
        { name: 'Messages deleted', value: `${messages.size}`, inline: true },
      ).setTimestamp()],
  });
});
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Custom ping replies — only fire if not a bot command
  if (!message.content.startsWith(PREFIX)) {
    for (const [userId, reply] of Object.entries(PING_REPLIES)) {
      if (message.content.includes(`<@${userId}>`)) {
        return message.reply(reply);
      }
    }
  }

  const isStaff = message.member?.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    STAFF_ROLE_IDS.some(id => message.member?.roles.cache.has(id));

  // Auto-mod (non-staff only)
  if (!isStaff) {
    if (containsBlacklisted(message.content)) {
      await message.delete().catch(() => {});
      const count = addWarning(message.guild.id, message.author.id, 'Used blacklisted word', 'Auto-mod');
      const reply = await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`❌ ${message.author} that word is not allowed here. **(warning ${count})**`).setTimestamp()] });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      logEmbed(message.guild, new EmbedBuilder().setColor(0xED4245).setTitle('🤬 Blacklisted Word')
        .addFields({ name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true }, { name: 'Channel', value: `<#${message.channel.id}>`, inline: true }, { name: 'Warnings', value: `${count}`, inline: true }).setTimestamp());
      return;
    }
    const spammed = await checkSpam(message);
    if (spammed) return;
  }

  // XP
  const key = `${message.guild.id}-${message.author.id}`;
  if (!xpCooldowns.has(key)) {
    xpCooldowns.set(key, true);
    setTimeout(() => xpCooldowns.delete(key), XP_COOLDOWN);
    const { level, leveledUp } = addXP(message.guild.id, message.author.id);
    if (leveledUp) {
      const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✨ ${message.author} just reached **level ${level}**! ♡`).setTimestamp()] });
      setTimeout(() => msg.delete().catch(() => {}), 10000);
    }
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args    = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ══ GENERAL ══════════════════════════════════════════════════════════════

  if (command === 'help') {
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${SERVER_NAME} — commands ✦`)
        .addFields(
          { name: '📋 general',            value: '`,ping` `,rank [@user]` `,leaderboard` `,profile [@user]` `,avatar [@user]` `,userinfo [@user]` `,serverinfo` `,suggest <idea>` `,remindme <time> <msg>` `,reminders` `,clearreminder <n>` `,ticket` `,stars [@user]` `,confess <msg>`' },
          { name: '🔨 moderation (staff)', value: '`,kick` `,ban` `,unban <id>` `,banlist` `,mute @user <mins>` `,unmute` `,warn` `,warnings` `,clearwarnings` `,note @user <note>` `,notes @user` `,deletenote @user <n>` `,addstars` `,removestars` `,giverole @user @role` `,takerole @user @role` `,roleall @role` `,unroleall @role` `,nickname @user <name>` `,slowmode <secs>` `,say <msg>` `,sayembed <msg>` `,purge <1-100>` `,announce <msg>` `,lockdown` `,unlockdown` `,addbot <id>` `,removebot <id>` `,addtrusted <id>` `,removetrusted <id>` `,listtrusted` `,setup`' },
        ).setFooter({ text: `${SERVER_NAME} ♡ | prefix: ,` })],
    });
  }

  if (command === 'ping') {
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`🏓 pong! **${client.ws.ping}ms** ♡`)] });
  }

  if (command === 'rank') {
    const target  = message.mentions.users.first() || message.author;
    const data    = getXP(message.guild.id, target.id);
    const needed  = xpForLevel(data.level + 1);
    const bars    = Math.min(20, Math.floor((data.xp / needed) * 20));
    const progress = '█'.repeat(bars) + '░'.repeat(20 - bars);
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.username}'s rank ✦`).setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields({ name: '⭐ level', value: `${data.level}`, inline: true }, { name: '✨ xp', value: `${data.xp} / ${needed}`, inline: true }, { name: '📊 total xp', value: `${data.totalXp || 0}`, inline: true })
        .setDescription(`\`${progress}\``).setFooter({ text: `${SERVER_NAME} ♡` })],
    });
  }

  if (command === 'leaderboard' || command === 'lb') {
    await message.channel.sendTyping();
    const guildXP    = xpData[message.guild.id] || {};
    const guildStars = starsData[message.guild.id] || {};

    const xpSorted    = Object.entries(guildXP).sort(([, a], [, b]) => (b.level * 100000 + (b.totalXp || 0)) - (a.level * 100000 + (a.totalXp || 0))).slice(0, 10);
    const starsSorted = Object.entries(guildStars).sort(([, a], [, b]) => b - a).slice(0, 10);

    const xpLines = await Promise.all(xpSorted.map(async ([uid, d], i) => {
      const u = await client.users.fetch(uid).catch(() => null);
      return `\`${String(i + 1).padStart(2, ' ')}.\` **${u?.username || 'unknown'}** ↳ level ${d.level} • ${d.totalXp || 0} xp`;
    }));
    const starLines = await Promise.all(starsSorted.map(async ([uid, s], i) => {
      const u = await client.users.fetch(uid).catch(() => null);
      return `\`${String(i + 1).padStart(2, ' ')}.\` **${u?.username || 'unknown'}** ↳ ${s} ⭐`;
    }));

    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31)
        .setTitle(`${SERVER_NAME} — leaderboard ✦`)
        .setDescription('*the most active and appreciated members* ♡')
        .addFields(
          { name: '✨ top xp',    value: xpLines.join('\n')    || 'no data yet ♡' },
          { name: '⭐ top stars', value: starLines.join('\n')  || 'no data yet ♡' },
        )
        .setFooter({ text: `${SERVER_NAME} ♡ • updated live` }).setTimestamp()],
    });
  }

  if (command === 'profile') {
    const target  = message.mentions.users.first() || message.author;
    const xp      = getXP(message.guild.id, target.id);
    const stars   = getStars(message.guild.id, target.id);
    const warns   = getWarnings(message.guild.id, target.id).length;
    const member2 = await message.guild.members.fetch(target.id).catch(() => null);
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.username}'s profile ✦`).setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '⭐ level',    value: `${xp.level}`,        inline: true },
          { name: '✨ total xp', value: `${xp.totalXp || 0}`, inline: true },
          { name: '🌟 stars',   value: `${stars}`,            inline: true },
          { name: '⚠️ warnings', value: `${warns}`,           inline: true },
          { name: '📅 joined',  value: member2 ? `<t:${Math.floor(member2.joinedTimestamp / 1000)}:R>` : 'unknown', inline: true },
        ).setFooter({ text: `${SERVER_NAME} ♡` }).setTimestamp()],
    });
  }

  if (command === 'stars') {
    const target = message.mentions.users.first() || message.author;
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⭐ **${target.username}** has **${getStars(message.guild.id, target.id)}** stars ♡`).setFooter({ text: `${SERVER_NAME} ♡` })] });
  }

  if (command === 'avatar') {
    const target = message.mentions.users.first() || message.author;
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.username}'s avatar`).setImage(target.displayAvatarURL({ dynamic: true, size: 512 }))] });
  }

  if (command === 'userinfo') {
    const target = message.mentions.members.first() || message.member;
    const roles  = target.roles.cache.filter(r => r.id !== message.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'none';
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.user.username}'s info ✦`).setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addFields({ name: 'tag', value: target.user.tag, inline: true }, { name: 'id', value: target.id, inline: true }, { name: 'joined server', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true }, { name: 'account age', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true }, { name: 'roles', value: roles })
        .setFooter({ text: `${SERVER_NAME} ♡` })],
    });
  }

  if (command === 'serverinfo') {
    const g = message.guild;
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${g.name} — server info ✦`).setThumbnail(g.iconURL({ dynamic: true }))
        .addFields({ name: 'owner', value: `<@${g.ownerId}>`, inline: true }, { name: 'members', value: `${g.memberCount}`, inline: true }, { name: 'boosts', value: `${g.premiumSubscriptionCount}`, inline: true }, { name: 'boost level', value: `level ${g.premiumTier}`, inline: true }, { name: 'created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true })
        .setFooter({ text: `${SERVER_NAME} ♡` })],
    });
  }

  if (command === 'suggest') {
    const idea = args.join(' ');
    if (!idea) return message.reply('❌ please provide a suggestion.');
    const forumCh = message.guild.channels.cache.get(SUGGESTIONS_CHANNEL_ID);
    if (!forumCh) return message.reply('❌ suggestions channel not found.');
    try {
      await forumCh.threads.create({ name: `suggestion by ${message.author.username}`, message: { embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle('💡 new suggestion').setDescription(idea).setFooter({ text: `suggested by ${message.author.tag}` }).setTimestamp()] } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription('✅ your suggestion has been submitted ♡')] });
    } catch { return message.reply('❌ could not post — make sure the channel is a forum channel.'); }
  }

  if (command === 'remindme') {
    const timeStr = args[0], msg = args.slice(1).join(' ');
    if (!timeStr || !msg) return message.reply('❌ usage: `,remindme <time> <message>` e.g. `,remindme 2h check server`');
    const ms = parseTime(timeStr);
    if (!ms) return message.reply('❌ invalid time. use s, m, h, or d (e.g. 30m, 2h, 1d)');
    if (!reminderData[message.author.id]) reminderData[message.author.id] = [];
    reminderData[message.author.id].push({ time: Date.now() + ms, message: msg });
    saveData('reminders.json', reminderData);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⏰ i'll remind you about "**${msg}**" <t:${Math.floor((Date.now() + ms) / 1000)}:R> ♡`)] });
  }

  if (command === 'reminders') {
    const userReminders = reminderData[message.author.id] || [];
    if (!userReminders.length) return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription('you have no pending reminders ♡')] });
    const list = userReminders.map((r, i) => `**${i + 1}.** "${r.message}" — <t:${Math.floor(r.time / 1000)}:R>`).join('\n');
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle('⏰ your reminders').setDescription(list).setFooter({ text: `${SERVER_NAME} ♡ | use ,clearreminder <number> to cancel` })] });
  }

  if (command === 'clearreminder') {
    const num = parseInt(args[0]);
    const userReminders = reminderData[message.author.id] || [];
    if (!userReminders.length) return message.reply('you have no reminders to cancel.');
    if (isNaN(num) || num < 1 || num > userReminders.length) return message.reply(`❌ please provide a valid number between 1 and ${userReminders.length}.`);
    const removed = userReminders.splice(num - 1, 1)[0];
    reminderData[message.author.id] = userReminders;
    saveData('reminders.json', reminderData);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ cancelled reminder: "${removed.message}" ♡`)] });
  }

  if (command === 'confess') {
    const confession = args.join(' ');
    if (!confession) return message.reply('❌ please provide a confession. usage: `,confess <message>`');
    if (!message.member.roles.cache.has(VERIFIED_ROLE_ID)) return message.reply({ content: '❌ you need to be verified to confess.', ephemeral: true });
    const confCh = message.guild.channels.cache.get(CONFESSION_CHANNEL_ID);
    if (!confCh) return message.reply('❌ confession channel not found.');
    const deleted = await message.delete().catch(() => null);
    if (!deleted) return message.reply('❌ i couldn\'t delete your message — make sure i have manage messages permission.');
    if (!confessionCount[message.guild.id]) confessionCount[message.guild.id] = 0;
    confessionCount[message.guild.id]++;
    saveData('confessions.json', confessionCount);
    const num = confessionCount[message.guild.id];
    await confCh.send({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`🤫 anonymous confession #${num}`)
        .setDescription(confession).setFooter({ text: `${SERVER_NAME} confessions ♡` }).setTimestamp()],
    });
    return message.author.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ your confession #${num} was posted anonymously ♡`)] }).catch(() => {});
  }

  if (command === 'ticket') {
    const map  = { support: 'support', report: 'report', appeal: 'ban_appeal', ban_appeal: 'ban_appeal' };
    const type = map[args[0]?.toLowerCase()];
    if (!type) {
      return message.reply({ content: 'what kind of ticket do you need? ♡', components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setEmoji('🎀').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_report').setLabel('Report a User').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_ban_appeal').setLabel('Ban Appeal').setEmoji('📋').setStyle(ButtonStyle.Secondary),
      )] });
    }
    return createTicket({ guild: message.guild, member: message.member, user: message.author, reply: o => message.reply(o) }, type);
  }

  // ══ STAFF ONLY ════════════════════════════════════════════════════════════
  if (!isStaff) return;

  // Bot whitelist
  if (command === 'addbot') {
    const botId = args[0];
    if (!botId) return message.reply('❌ usage: `,addbot <bot_id>`');
    if (botWhitelist.includes(botId)) return message.reply('✅ that bot is already whitelisted.');
    botWhitelist.push(botId);
    saveList('botwhitelist.json', botWhitelist);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ bot \`${botId}\` added to the whitelist ♡`)] });
  }

  if (command === 'removebot') {
    const botId = args[0];
    if (!botId) return message.reply('❌ usage: `,removebot <bot_id>`');
    botWhitelist = botWhitelist.filter(id => id !== botId);
    saveList('botwhitelist.json', botWhitelist);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ bot \`${botId}\` removed from the whitelist.`)] });
  }

  // Trusted users (bypass alt account age ban)
  if (command === 'addtrusted') {
    const userId = args[0];
    if (!userId) return message.reply('❌ usage: `,addtrusted <user_id>`');
    if (trustedUsers.includes(userId)) return message.reply('✅ that user is already trusted.');
    trustedUsers.push(userId);
    saveList('trusted.json', trustedUsers);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ user \`${userId}\` is now trusted — they can join even with a new account ♡`)] });
  }

  if (command === 'removetrusted') {
    const userId = args[0];
    if (!userId) return message.reply('❌ usage: `,removetrusted <user_id>`');
    trustedUsers = trustedUsers.filter(id => id !== userId);
    saveList('trusted.json', trustedUsers);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ user \`${userId}\` removed from trusted list.`)] });
  }

  if (command === 'listtrusted') {
    if (!trustedUsers.length) return message.reply('no trusted users added yet.');
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle('trusted users').setDescription(trustedUsers.map((id, i) => `**${i + 1}.** \`${id}\``).join('\n')).setFooter({ text: `${SERVER_NAME} ♡` })] });
  }

  // Give/take role from a specific person
  if (command === 'giverole') {
    const target = message.mentions.members.first();
    const role   = message.mentions.roles.first();
    if (!target || !role) return message.reply('❌ usage: `,giverole @user @role`');
    await target.roles.add(role).catch(() => {});
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ gave **${role.name}** to **${target.user.tag}** ♡`)] });
  }

  if (command === 'takerole') {
    const target = message.mentions.members.first();
    const role   = message.mentions.roles.first();
    if (!target || !role) return message.reply('❌ usage: `,takerole @user @role`');
    await target.roles.remove(role).catch(() => {});
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ removed **${role.name}** from **${target.user.tag}** ♡`)] });
  }

  // Nickname
  if (command === 'nickname' || command === 'nick') {
    const target   = message.mentions.members.first();
    const nickname = args.slice(1).join(' ') || null;
    if (!target) return message.reply('❌ usage: `,nickname @user <new nickname>` — leave nickname blank to reset');
    await target.setNickname(nickname).catch(() => {});
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(nickname ? `✅ set **${target.user.tag}**'s nickname to **${nickname}** ♡` : `✅ reset **${target.user.tag}**'s nickname ♡`)] });
  }

  // Slowmode
  if (command === 'slowmode') {
    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply('❌ provide seconds between 0 and 21600. use 0 to disable.');
    await message.channel.setRateLimitPerUser(seconds);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(seconds === 0 ? '✅ slowmode disabled ♡' : `✅ slowmode set to **${seconds}s** ♡`)] });
  }

  // Notes
  if (command === 'note') {
    const target = message.mentions.members.first();
    const note   = args.slice(1).join(' ');
    if (!target || !note) return message.reply('❌ usage: `,note @user <note>`');
    addNote(message.guild.id, target.id, note, message.author.tag);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ note saved for **${target.user.tag}** ♡`)] });
  }

  if (command === 'notes') {
    const target = message.mentions.members.first() || message.member;
    const notes  = getNotes(message.guild.id, target.id);
    if (!notes.length) return message.reply(`no notes found for **${target.user.tag}**.`);
    const list = notes.map((n, i) => `**${i + 1}.** ${n.note} — by ${n.staffTag} <t:${Math.floor(new Date(n.date).getTime() / 1000)}:R>`).join('\n');
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`notes for ${target.user.username}`).setDescription(list).setFooter({ text: `total: ${notes.length}` })] });
  }

  if (command === 'addstars') {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount)) return message.reply('❌ usage: `,addstars @user <amount>`');
    const total = addStars(message.guild.id, target.id, amount);
    const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle('⭐ stars added').addFields({ name: 'user', value: target.tag, inline: true }, { name: 'added', value: `+${amount}`, inline: true }, { name: 'total', value: `${total}`, inline: true }).setTimestamp();
    message.channel.send({ embeds: [embed] });
    return logEmbed(message.guild, embed);
  }

  if (command === 'removestars') {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount)) return message.reply('❌ usage: `,removestars @user <amount>`');
    const total = addStars(message.guild.id, target.id, -amount);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription(`⭐ removed **${amount}** stars from **${target.tag}**. they now have **${total}** ♡`)] });
  }

  if (command === 'adduser') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ please mention a user.');
    await message.channel.permissionOverwrites.edit(target, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    return message.reply(`✅ Added **${target.user.tag}** to this ticket.`);
  }

  if (command === 'removeuser') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ please mention a user.');
    await message.channel.permissionOverwrites.edit(target, { ViewChannel: false });
    return message.reply(`✅ Removed **${target.user.tag}** from this ticket.`);
  }

  if (command === 'warn') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ please mention a user.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    const count  = addWarning(message.guild.id, target.id, reason, message.author.tag);
    const embed  = new EmbedBuilder().setColor(0xFEE75C).setTitle('⚠️ member warned').addFields({ name: 'user', value: target.user.tag, inline: true }, { name: 'moderator', value: message.author.tag, inline: true }, { name: 'reason', value: reason }, { name: 'total warnings', value: `${count}` }).setTimestamp();
    message.channel.send({ embeds: [embed] });
    target.user.send({ embeds: [embed] }).catch(() => {});
    return logEmbed(message.guild, embed);
  }

  if (command === 'warnings') {
    const target = message.mentions.members.first() || message.member;
    const warns  = getWarnings(message.guild.id, target.id);
    if (!warns.length) return message.reply(`✅ **${target.user.tag}** has no warnings.`);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0xFEE75C).setTitle(`${target.user.username}'s warnings`).setDescription(warns.map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.moderator} <t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>`).join('\n')).setFooter({ text: `total: ${warns.length}` })] });
  }

  if (command === 'clearwarnings') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ please mention a user.');
    clearWarnings(message.guild.id, target.id);
    return message.reply(`✅ Cleared all warnings for **${target.user.tag}**.`);
  }

  if (command === 'announce') {
    const text = args.join(' ');
    if (!text) return message.reply('❌ please provide a message.');
    const ch = message.guild.channels.cache.get(ANNOUNCE_CHANNEL_ID);
    if (!ch) return message.reply('❌ announce channel not found.');
    await ch.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle('📢 announcement').setDescription(text).setFooter({ text: `announced by ${message.author.tag}` }).setTimestamp()] });
    return message.reply('✅ Announcement sent!');
  }

  if (command === 'lockdown') {
    message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => {}));
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('🔒 server locked down.').setTimestamp()] });
  }

  if (command === 'unlockdown') {
    message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }).catch(() => {}));
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription('🔓 server unlocked ♡').setTimestamp()] });
  }

  if (command === 'roleall') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply('❌ please mention a role. e.g. `,roleall @rolename`');
    const msg = await message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⏳ adding **${role.name}** to all members... this may take a while ♡`)] });
    const members = await message.guild.members.fetch();
    let count = 0;
    for (const [, m] of members) { if (!m.roles.cache.has(role.id)) { await m.roles.add(role).catch(() => {}); count++; } }
    return msg.edit({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ added **${role.name}** to **${count}** members ♡`)] });
  }

  if (command === 'unroleall') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply('❌ please mention a role. e.g. `,unroleall @rolename`');
    const msg = await message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⏳ removing **${role.name}** from all members... this may take a while ♡`)] });
    const members = await message.guild.members.fetch();
    let count = 0;
    for (const [, m] of members) { if (m.roles.cache.has(role.id)) { await m.roles.remove(role).catch(() => {}); count++; } }
    return msg.edit({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ removed **${role.name}** from **${count}** members ♡`)] });
  }

  if (command === 'kick') {
    const target = message.mentions.members.first();
    if (!target || !target.kickable) return message.reply('❌ Cannot kick this user.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.kick(reason);
    const embed = modEmbed('🥾 member kicked', target.user, message.author, reason);
    message.channel.send({ embeds: [embed] });
    return logEmbed(message.guild, embed);
  }

  if (command === 'ban') {
    const target = message.mentions.members.first();
    if (!target || !target.bannable) return message.reply('❌ Cannot ban this user.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.ban({ reason });
    const embed = modEmbed('🔨 member banned', target.user, message.author, reason);
    message.channel.send({ embeds: [embed] });
    return logEmbed(message.guild, embed);
  }

  if (command === 'unban') {
    if (!args[0]) return message.reply('❌ please provide a user ID.');
    try { const u = await message.guild.members.unban(args[0]); message.reply(`✅ Unbanned **${u.tag}**.`); }
    catch { message.reply('❌ Could not find a ban for that ID.'); }
    return;
  }

  if (command === 'mute') {
    const target  = message.mentions.members.first();
    const minutes = parseInt(args[1]);
    if (!target || isNaN(minutes) || minutes < 1) return message.reply('❌ usage: `,mute @user <minutes>`');
    const reason = args.slice(2).join(' ') || 'No reason provided';
    await target.timeout(minutes * 60 * 1000, reason);
    const embed = modEmbed(`🔇 member muted (${minutes}m)`, target.user, message.author, reason);
    message.channel.send({ embeds: [embed] });
    return logEmbed(message.guild, embed);
  }

  if (command === 'unmute') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ please mention a user.');
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

  if (command === 'setup') {
    await postRules(message.guild);
    await postTicketPanel(message.guild);
    await postVerifyPanel(message.guild);
    return message.reply('✅ Rules, ticket panel & verify panel updated!').then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
  }

  // Say / sayembed — speak as the bot
  if (command === 'say') {
    const text = args.join(' ');
    if (!text) return message.reply('❌ usage: `,say <message>`');
    await message.delete().catch(() => {});
    return message.channel.send(text);
  }

  if (command === 'sayembed') {
    const text = args.join(' ');
    if (!text) return message.reply('❌ usage: `,sayembed <message>`');
    await message.delete().catch(() => {});
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(text).setFooter({ text: `${SERVER_NAME} ♡` })] });
  }

  // Banlist
  if (command === 'banlist') {
    await message.channel.sendTyping();
    const bans = await message.guild.bans.fetch().catch(() => null);
    if (!bans || !bans.size) return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription('no banned users ♡')] });
    const list = [...bans.values()].slice(0, 20).map((b, i) => `**${i + 1}.** ${b.user.tag} — ${b.reason || 'no reason'}`).join('\n');
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${message.guild.name} — ban list`).setDescription(list).setFooter({ text: `total: ${bans.size} bans` })] });
  }

  // Delete a note
  if (command === 'deletenote') {
    const target = message.mentions.members.first();
    const num    = parseInt(args[1]);
    if (!target || isNaN(num)) return message.reply('❌ usage: `,deletenote @user <number>`');
    const notes = getNotes(message.guild.id, target.id);
    if (!notes.length) return message.reply(`no notes found for **${target.user.tag}**.`);
    if (num < 1 || num > notes.length) return message.reply(`❌ please provide a number between 1 and ${notes.length}.`);
    const removed = notes.splice(num - 1, 1)[0];
    notesData[message.guild.id][target.id] = notes;
    saveData('notes.json', notesData);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✅ deleted note: "${removed.note}" ♡`)] });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function modEmbed(title, targetUser, moderator, reason) {
  return new EmbedBuilder().setColor(0x2b2d31).setTitle(title)
    .addFields({ name: 'user', value: `${targetUser.tag} (${targetUser.id})`, inline: true }, { name: 'moderator', value: moderator.tag, inline: true }, { name: 'reason', value: reason })
    .setTimestamp();
}

client.login(process.env.DISCORD_TOKEN);
