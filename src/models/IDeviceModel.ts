export interface IDeviceModel {
	_id: string;
	old_id?: number;
	name: string;
	created_at: Date | number;
}

export default IDeviceModel;
