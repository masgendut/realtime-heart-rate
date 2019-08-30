export interface IPulseModel {
	_id: string;
	old_id?: number;
	device_id: string;
	pulse: number;
	emitted_at: Date | number;
	created_at: Date | number;
	arrived_at?: Date | number;
}

export default IPulseModel;
