import moment from 'moment';

export class DateTime {
	public static formatDate(date: Date | number = new Date()): number {
		return moment(date)
			.utc()
			.valueOf();
	}
}

export default DateTime;
