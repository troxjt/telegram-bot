const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "guildMemberRemove",
	once: false,
	async execute(member, client) {
        const byebyeEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Cung cấp thiết bị, tài nguyên MMO')
            .setDescription(`Tạm biệt ${member}!`)
            .setThumbnail(member.user.displayAvatarURL())
            // .setImage(client.config.Info.Image)
            .setFooter({ text: 'Hẹn gặp lại trong thời gian sớm nhất!', iconURL: member.guild.iconURL() })
            .setTimestamp();

        const channel = member.guild.channels.cache.get('1376769043440078908');
        if (channel) {
            channel.send({ embeds: [byebyeEmbed] });
        }
    },
};
