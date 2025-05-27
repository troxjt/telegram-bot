const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "guildMemberRemove",
	once: false,
	async execute(member, client) {
        const byebyeChannelId = "1284383002675253319";

        const byebyeEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('X Develop - Dịch vụ FiveM Việt Nam')
            .setDescription(`Tạm biệt ${member}!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setImage(client.config.Info.Image)
            .setFooter({ text: 'Hẹn gặp lại trong thời gian sớm nhất!', iconURL: member.guild.iconURL() })
            .setTimestamp();

        const channel = member.guild.channels.cache.get(byebyeChannelId);
        if (channel) {
            channel.send({ embeds: [byebyeEmbed] });
        }
    },
};
