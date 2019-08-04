import moment from 'moment';

export class DateTime {

	public static formatDate(date: Date): string {
		return moment(date).utc().format('YYYY-MM-DD HH:mm:ss');
	}

}

export default DateTime;
