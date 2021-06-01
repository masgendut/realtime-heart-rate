const timezoneIdentifier = Intl.DateTimeFormat().resolvedOptions().timeZone;

function formatDate(date) {
	return moment(date).tz(timezoneIdentifier).format('L LTS');
}
