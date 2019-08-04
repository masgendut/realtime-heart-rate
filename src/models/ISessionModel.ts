export interface ISessionModel {
	_id?: string;
	client_id: string;
	user_agent: { [key: string]: any };
	created_at?: string | Date;
}

export default ISessionModel;
