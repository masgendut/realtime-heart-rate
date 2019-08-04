export interface IPulseArrivalModel {
	_id?: string;
	pulse_id: string;
	session_id: string;
	arrived_at: Date | number;
	created_at?: Date | number;
}

export default IPulseArrivalModel;
