export interface ISessionModel {
	_id?: string;
	client_id: string;
	user_agent: { [key: string]: any };
	created_at?: Date | number;
}

export default ISessionModel;
