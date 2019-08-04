export interface IPulseModel {
    _id?: string;
    device_id: string;
    pulse: number;
    emitted_at: string | Date;
    created_at?: string | Date;
}

export default IPulseModel;
